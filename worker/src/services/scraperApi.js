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

  async fetchWithEvasion(targetUrl, sessionId, signal) {
    // 1. Trigger Apify Run
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${this.actorId}/runs?token=${this.env.APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: targetUrl
      }),
      signal
    });

    if (!runResponse.ok) {
      return { ok: false, status: runResponse.status };
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;

    // 2. Poll for Completion
    let runStatus = runData.data.status;
    const terminalStatuses = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];

    while (!terminalStatuses.includes(runStatus)) {
      if (signal && signal.aborted) {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${this.actorId}/runs/${runId}?token=${this.env.APIFY_API_TOKEN}`, {
        signal
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.data.status;
      } else {
        // If status check fails, break and return failure
        return { ok: false, status: statusResponse.status };
      }
    }

    if (runStatus !== 'SUCCEEDED') {
      return { ok: false, status: 500 };
    }

    // 3. Fetch Dataset Items
    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.env.APIFY_API_TOKEN}`, {
      signal
    });

    if (!datasetResponse.ok) {
      return { ok: false, status: datasetResponse.status };
    }

    const rawItems = await datasetResponse.json();

    // 4. Map Dataset Schema
    // cleanly mapped into an array of objects possessing only the required keys
    const mappedRecords = rawItems.map(item => ({
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      origin_url: item.origin_url || targetUrl
    }));

    return {
      ok: true,
      status: 200,
      json: async () => ({ records: mappedRecords, next_cursor: null })
    };
  }
}
