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
      return { ok: false, status: runResponse.status };
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
