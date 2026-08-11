import { Telemetry } from '../utils/telemetry.js';
/**
 * Apify Proxy & Scraper Integration
 * Offloads JS rendering, CAPTCHA solving, and IP rotation to Apify Actor.
 */
export class ScraperAPI {
  constructor(env) {
    this.env = env;
    this.actorId = this.env.APIFY_ACTOR_ID || '{ACTOR_ID}';
  }

  async executeJitter() {
    // Introduce entropy to defeat time-based WAF signatures
    const randomDelay = Math.floor(Math.random() * (15000 - 1000 + 1) + 1000);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  async fetchWithEvasion(targetUrl, sessionId, parentSignal, webhookUrl = null) {
    const controller = new AbortController();
    const signal = controller.signal;
    if (parentSignal) {
      parentSignal.addEventListener('abort', () => controller.abort());
    }

    const payload = {
      startUrls: [{ url: targetUrl }]
    };

    if (webhookUrl) {
      payload.webhooks = [
        {
          eventTypes: ["ACTOR.RUN.SUCCEEDED"],
          requestUrl: webhookUrl
        }
      ];
    }

    // 1. Trigger Apify Run
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${this.actorId}/runs?token=${this.env.APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!runResponse.ok) {
      const telemetry = new Telemetry(this.env);
      let errorText = '';
      try {
        errorText = await runResponse.text();
      } catch (e) { /* ignore */ }

      const errorBuffer = {
        error_code: runResponse.status,
        error_message: errorText,
        target_url: targetUrl,
        timestamp: new Date().toISOString()
      };
      await telemetry.report("APIFY_API_ERROR", "HIGH", "scraperApi", `Failed to start run: ${runResponse.status}`, errorBuffer);

      return { ok: false, status: runResponse.status, errorText, errorBuffer };
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;

    return {
      ok: true,
      status: 202,
      json: async () => ({
        records: [],
        next_cursor: null,
        runId: runId,
        defaultDatasetId: defaultDatasetId
      })
    };
  }
}

/**
 * Onyx LLM Proxy Skeleton
 * Routes raw unstructured text to our internal AXiM LLM proxy for schema-rigid extraction.
 */
export async function cognitiveExtractWithOnyx(unstructuredText, env) {
  const workerHost = env.WORKER_HOST || "axim-scraper-node.workers.dev";
  const proxyUrl = `https://${workerHost}/api/llm-proxy`;
  const internalKey = env.AXIM_INTERNAL_KEY;

  if (!internalKey) {
    throw new Error("Missing AXIM_INTERNAL_KEY for Onyx LLM Proxy.");
  }

  const systemPrompt = "Return only a JSON object matching this exact schema: { first_name, last_name, phone, email, type: 'B2C_CONSUMER' }. Do not include any additional text or explanations.";

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${internalKey}`
    },
    body: JSON.stringify({
      system_prompt: systemPrompt,
      data: unstructuredText
    })
  });

  if (!response.ok) {
    throw new Error(`Onyx LLM Proxy failed with status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Validates raw items against strict schema constraints.
 * If validation fails, routes the item through cognitive fallback parsing.
 */
export async function enforceSchemaAndExtract(rawItems, env, telemetry) {
  const mappedRecords = [];

  for (const item of rawItems) {
    const hasFirstName = !!item.first_name;
    const hasPhone = !!item.phone;
    const hasEmail = !!item.email;

    // Schema constraint check - MUST have first_name, AND either phone OR email
    const isValidSchema = hasFirstName && (hasPhone || hasEmail);
    const hasUnstructuredFlag = item.raw_html || item.unstructured_text;

    if (!isValidSchema || hasUnstructuredFlag) {
      const rawText = item.raw_html || item.unstructured_text || JSON.stringify(item);
      try {
        const cognitiveResult = await cognitiveExtractWithOnyx(rawText, env);
        mappedRecords.push({
          first_name: cognitiveResult.first_name || item.first_name || '',
          last_name: cognitiveResult.last_name || item.last_name || '',
          email: cognitiveResult.email || item.email || '',
          phone: cognitiveResult.phone || item.phone || '',
          address: cognitiveResult.address || item.address || '',
          type: cognitiveResult.type || 'B2C_CONSUMER',
          origin_url: item.origin_url || 'Unknown'
        });
        await telemetry.report("ONYX_EXTRACTION_SUCCESS", "LOW", "schema_enforcer", `Successfully parsed unstructured item`);
      } catch (cogErr) {
         await telemetry.report("ONYX_EXTRACTION_FAILED", "MEDIUM", "schema_enforcer", `Fallback failed: ${cogErr.message}`);
         // Final safety fallback to basic mapping if cognitive fails, even if it violates strict schema
         // since Egress validates further and will drop them anyway if missing phone AND email
         mappedRecords.push({
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            email: item.email || '',
            phone: item.phone || '',
            address: item.address || '',
            origin_url: item.origin_url || 'Unknown'
         });
      }
    } else {
      // Clean pass
      mappedRecords.push({
        first_name: item.first_name || '',
        last_name: item.last_name || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        origin_url: item.origin_url || 'Unknown'
      });
    }
  }

  return mappedRecords;
}
