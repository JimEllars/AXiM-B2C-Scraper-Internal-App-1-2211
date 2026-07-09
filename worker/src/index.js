import { ScraperAPI } from './services/scraperApi.js';
import { KVStore } from './services/kvStore.js';
import { Egress } from './services/egress.js';
import { Telemetry } from './utils/telemetry.js';

/**
 * Onyx Mk3 Edge Worker
 * Handles three trigger types:
 * 1. Scheduled (Cron) - Periodic background extraction.
 * 2. Fetch (Manual/External) - API-driven extraction.
 */
export default {
  async scheduled(event, env, ctx) {

    // TRIGGER TYPE: SCHEDULED
    // Automatically runs based on wrangler.toml crons
    const telemetry = new Telemetry(env);
    await telemetry.report("CRON_START", "LOW", "edge_worker", "Cron execution started");

    let targetUrl = env.DEFAULT_CRON_TARGET_URL;

    // Read queue from KV
    const kv = env.B2C_SCRAPER_STATE;
    if (kv) {
      try {
        const queueStr = await kv.get("TARGET_QUEUE");
        if (!queueStr || JSON.parse(queueStr).length === 0) {
          await telemetry.report("QUEUE_EMPTY_SLEEPING", "LOW", "edge_worker", "Target queue is empty. Sleeping.");
          return;
        }

        const queue = JSON.parse(queueStr);
        const activeTargets = queue.filter(t => t.status === 'RUNNING');

        if (activeTargets.length > 0) {
          // Pick a random target to process, or could pop/shift. Let's pick random for rotation as frontend did.
          const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
          targetUrl = target.url;
        } else {
          await telemetry.report("QUEUE_EMPTY_SLEEPING", "LOW", "edge_worker", "No running targets. Sleeping.");
          return;
        }
      } catch (e) {
        await telemetry.report("CRON_QUEUE_ERROR", "MEDIUM", "edge_worker", "Failed to parse target queue from KV");
      }
    }

    ctx.waitUntil(
      this.executeScrapeCycle(env, ctx, { source: 'CRON_SCHEDULE', targetUrl })
        .then(async (metrics) => {
          await telemetry.report("CRON_END", "LOW", "edge_worker", `Cron execution finished. Records: ${metrics?.recordsProcessed || 0}, Final Cursor: ${metrics?.finalCursor || 'Unknown'}, RunId: ${metrics?.runId || 'None'}`);
        })
        .catch(async (err) => {
          await telemetry.report("CRON_END_ERROR", "HIGH", "edge_worker", `Cron execution failed: ${err.message}`);
        })
    );
  },


  async fetch(request, env, ctx) {
    const corsOrigin = env.ENVIRONMENT === 'local' ? '*' : env.FRONTEND_URL;
    const url = new URL(request.url);
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }
    

    // 0. Target Queue Manager endpoints
    if (url.pathname === "/api/targets") {
      const authHeader = request.headers.get("Authorization");

      if (authHeader !== `Bearer ${env.DASHBOARD_ACCESS_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Node Access" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
        });
      }

      if (request.method === "GET") {
        const kv = env.B2C_SCRAPER_STATE;
        let queue = [];
        const queueStr = await kv.get("TARGET_QUEUE");
        if (queueStr) {
          try {
            queue = JSON.parse(queueStr);
          } catch (e) { /* ignore */ }
        }
        return new Response(JSON.stringify(queue), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": corsOrigin
          }
        });
      }

      if (request.method === "POST") {
        const payload = await request.json();
        const kv = env.B2C_SCRAPER_STATE;
        let queue = [];
        const queueStr = await kv.get("TARGET_QUEUE");
        if (queueStr) {
          try {
            queue = JSON.parse(queueStr);
          } catch (e) { /* ignore */ }
        }

        if (Array.isArray(payload)) {
           queue.push(...payload);
        } else {
           queue.push(payload);
        }

        await kv.put("TARGET_QUEUE", JSON.stringify(queue));

        return new Response(JSON.stringify({ status: "ACKNOWLEDGED", queueLength: queue.length }), {
          status: 202,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": corsOrigin
          }
        });
      }

      if (request.method === "PUT") {
         const payload = await request.json();
         const kv = env.B2C_SCRAPER_STATE;
         let queue = [];
         const queueStr = await kv.get("TARGET_QUEUE");
         if (queueStr) {
           try {
             queue = JSON.parse(queueStr);
           } catch (e) { /* ignore */ }
         }

         const idx = queue.findIndex(t => t.id === payload.id);
         if (idx !== -1) {
             queue[idx] = { ...queue[idx], ...payload };
         } else {
             queue.push(payload);
         }
         await kv.put("TARGET_QUEUE", JSON.stringify(queue));

         return new Response(JSON.stringify({ status: "ACKNOWLEDGED", queueLength: queue.length }), {
            status: 202,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": corsOrigin
            }
          });
      }

      if (request.method === "DELETE") {
         const urlParams = new URL(request.url).searchParams;
         const id = urlParams.get("id");
         const kv = env.B2C_SCRAPER_STATE;
         let queue = [];
         const queueStr = await kv.get("TARGET_QUEUE");
         if (queueStr) {
           try {
             queue = JSON.parse(queueStr);
           } catch (e) { /* ignore */ }
         }

         if (id) {
            queue = queue.filter(t => t.id !== id);
         }
         await kv.put("TARGET_QUEUE", JSON.stringify(queue));

         return new Response(JSON.stringify({ status: "ACKNOWLEDGED", queueLength: queue.length }), {
            status: 202,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": corsOrigin
            }
          });
      }
    }

    // 1. External AXiM Ecosystem Trigger

    if (url.pathname === "/api/trigger" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      
      if (authHeader !== `Bearer ${env.DASHBOARD_ACCESS_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Node Access" }), { 
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
        });
      }

      const payload = await request.json();
      
      try {
        if (!env.APIFY_API_TOKEN || !env.AXIM_INTERNAL_KEY) {
          throw new Error("Missing required production secrets.");
        }

        const result = await this.executeScrapeCycle(env, ctx, {
          source: payload.source || 'EXTERNAL_API',
          targetUrl: payload.targetUrl,
          priority: payload.priority || 'NORMAL',
          dryRun: payload.dry_run || false
        });

        return new Response(JSON.stringify({
          status: "ACKNOWLEDGED",
          node: "AXIM_ONYX_MK3",
          job_id: crypto.randomUUID(),
          ...result
        }), { status: 202, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
      } catch (err) {
         return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
      }
    }

    // WEBHOOK HANDLER
    if (url.pathname === "/api/apify-webhook" && request.method === "POST") {
      try {
        const rawBody = await request.text();
        const signatureHeader = request.headers.get("x-apify-signature");

        if (!signatureHeader || !env.APIFY_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Missing signature or secret" }), { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
        }

        // Validate Signature using WebCrypto
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          enc.encode(env.APIFY_WEBHOOK_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
        const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

        if (computedSignature !== signatureHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid signature" }), { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
        }

        const payload = JSON.parse(rawBody);

        // Ensure this is a SUCCEEDED event
        if (payload.eventType !== 'ACTOR.RUN.SUCCEEDED') {
           return new Response(JSON.stringify({ status: "IGNORED" }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
        }

        const runId = payload.eventData.actorRunId;
        const defaultDatasetId = payload.resource.defaultDatasetId;

        const telemetry = new Telemetry(env);
        const egress = new Egress(env);

        ctx.waitUntil((async () => {
          try {
            const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${env.APIFY_API_TOKEN}`);
            if (datasetResponse.ok) {
              const rawItems = await datasetResponse.json();

              // Map Dataset Schema
              const mappedRecords = rawItems.map(item => ({
                first_name: item.first_name || '',
                last_name: item.last_name || '',
                email: item.email || '',
                phone: item.phone || '',
                address: item.address || '',
                origin_url: item.origin_url || 'Unknown' // Needs to be pulled from dataset or passed via webhook
              }));

              await egress.transmit(mappedRecords, false, runId);
              await telemetry.report("SCRAPE_COMPLETE", "LOW", "edge_worker", `Successfully processed dataset for runId: ${runId}`);
            } else {
              await telemetry.report("DATASET_FETCH_ERROR", "HIGH", "edge_worker", `Failed to fetch dataset ${defaultDatasetId}: ${datasetResponse.status}`);
            }
          } catch(e) {
            await telemetry.report("WEBHOOK_PROCESSING_ERROR", "HIGH", "edge_worker", e.message);
          }
        })());

        return new Response(JSON.stringify({ status: "ACKNOWLEDGED" }), { status: 202, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
      }
    }

    // ONYX TRIGGER
    if (url.pathname === "/api/onyx-trigger" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");

      if (authHeader !== `Bearer ${env.AXIM_INTERNAL_KEY}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Node Access" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
        });
      }

      const payload = await request.json();

      try {
        if (!env.APIFY_API_TOKEN || !env.AXIM_INTERNAL_KEY) {
          throw new Error("Missing required production secrets.");
        }

        if (!payload.target_url) {
           throw new Error("Missing target_url.");
        }

        const telemetry = new Telemetry(env);
        const scraper = new ScraperAPI(env);
        const workerHost = url.hostname;
        const webhookUrl = `https://${workerHost}/api/apify-webhook`;

        await telemetry.report("ONYX_INTERCEPT_ACTIVATED", "HIGH", "edge_worker", `Onyx Mk3 triggered for URL: ${payload.target_url}`);

        const response = await scraper.fetchWithEvasion(payload.target_url, null, null, webhookUrl);

        if (!response.ok) {
           throw new Error(`Apify trigger failed: ${response.status}`);
        }

        const rawData = await response.json();

        await telemetry.report("APIFY_RUN_STARTED", "LOW", "edge_worker", `Apify Run Started: ${rawData.runId}`);

        return new Response(JSON.stringify({
          status: "ACCEPTED",
          node: "AXIM_ONYX_MK3",
          job_id: crypto.randomUUID(),
          runId: rawData.runId
        }), { status: 202, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
      } catch (err) {
         return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin } });
      }
    }

    // 3. KV State Polling Endpoint
    if (url.pathname === "/api/state" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization");

      if (authHeader !== `Bearer ${env.DASHBOARD_ACCESS_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Node Access" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
        });
      }

      const kv = new KVStore(env);
      const states = await kv.getAllStates();

      return new Response(JSON.stringify(states), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": corsOrigin
        }
      });
    }

    // 2. Health Check
    if (url.pathname === "/health") {
      const configured = !!(env.APIFY_API_TOKEN && env.AXIM_INTERNAL_KEY);
      return new Response(JSON.stringify({
        status: "ONLINE",
        load: "PASSIVE",
        configured,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": corsOrigin
        }
      });
    }

    return new Response("AXiM Onyx Node: Awaiting Orchestration", { status: 404, headers: { "Access-Control-Allow-Origin": corsOrigin } });
  },

  async executeScrapeCycle(env, ctx, config) {
    const telemetry = new Telemetry(env);
    const scraper = new ScraperAPI(env);
    const kv = new KVStore(env);
    const egress = new Egress(env);

    if (!env.APIFY_API_TOKEN || !env.AXIM_INTERNAL_KEY) {
      await telemetry.report("missing_production_secrets", "HIGH", "edge_worker", "Required production secrets APIFY_API_TOKEN or AXIM_INTERNAL_KEY are missing.");
      await kv.releaseSystemLock();
      throw new Error("Missing required production secrets.");
    }
    
    await telemetry.report("execution_start", "LOW", "edge_worker", `Source: ${config.source}`);

    const sysLockAcquired = await kv.acquireSystemLock();
    if (!sysLockAcquired) {
      await telemetry.report("SYSTEM_LOCKED_CONCURRENCY_PREVENTED", "MEDIUM", "edge_worker", "System locked by another execution.");
      return { recordsProcessed: 0, finalCursor: null };
    }

    try {
      if (!config.targetUrl) {
        throw new Error("No target URL provided in configuration.");
      }
      const targetUrl = config.targetUrl;
      const egressDomainHash = await egress.generateHash(targetUrl, "orchestrator");
      
      let state = await kv.getTargetState(egressDomainHash);
      if (!state) {
        state = { status: "IDLE", metrics: { consecutive_failures: 0, total_records_extracted: 0 }, pagination_cursor: null };
      }

      const locked = await kv.acquireLock(egressDomainHash, state);
      if (!locked) {
        await telemetry.report("lock_conflict", "MEDIUM", "kv_store", `Worker collision for ${targetUrl}`);
        return { recordsProcessed: 0, finalCursor: state.pagination_cursor };
      }

      let response;
      try {
        await scraper.executeJitter();
        // Construct webhookUrl dynamically from environment if possible, or fallback.
        // During cron, it may be tricky to get the exact hostname, but typically configured via env variable.
        // Assuming WORKER_HOST is set in wrangler.toml or env.
        const workerHost = env.WORKER_HOST || "axim-scraper-node.workers.dev";
        const webhookUrl = `https://${workerHost}/api/apify-webhook`;

        response = await scraper.fetchWithEvasion(targetUrl, state.pagination_cursor, null, webhookUrl);

        if (!response.ok) {
          throw new Error(`Proxy rejection: HTTP ${response.status}`);
        }
      } catch (scrapeErr) {
        if (scrapeErr.name === 'AbortError' || scrapeErr.name === 'APIFY_TIMEOUT') {
          await telemetry.report("timeout_error", "HIGH", "scraper_api", `Timeout exceeded for ${targetUrl}`);
          await kv.releaseLockAndCommit(egressDomainHash, state, false);
          throw new Error("APIFY_TIMEOUT");
        } else {
          await telemetry.report("proxy_rejection", "HIGH", "scraper_api", scrapeErr.message);
          await kv.releaseLockAndCommit(egressDomainHash, state, false);
          throw scrapeErr;
        }
      }

      let rawData;
      try {
        rawData = await response.json();
      } catch (parseError) {
        await telemetry.report("proxy_payload_parse_error", "HIGH", "scraper_api", "Failed to parse JSON response from proxy.");
        await kv.releaseLockAndCommit(egressDomainHash, state, false);
        return { recordsProcessed: 0, finalCursor: state.pagination_cursor };
      }

      // Log the start of the Apify Run
      await telemetry.report("APIFY_RUN_STARTED", "LOW", "edge_worker", `Apify Run Started: ${rawData.runId}`);

      // Release lock since Apify is running async now
      await kv.releaseLockAndCommit(egressDomainHash, state, true, rawData.next_cursor);

      return { recordsProcessed: 0, finalCursor: rawData.next_cursor, runId: rawData.runId, status: "ACCEPTED" };

    } catch (error) {
      await telemetry.report("execution_error", "HIGH", "edge_worker", error.message);
      throw error;
    } finally {
      await kv.releaseSystemLock();
    }
  }
};
