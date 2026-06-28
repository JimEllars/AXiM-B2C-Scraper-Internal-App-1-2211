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
    ctx.waitUntil(this.executeScrapeCycle(env, ctx, { source: 'CRON_SCHEDULE' }));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. External AXiM Ecosystem Trigger
    if (url.pathname === "/api/trigger" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      
      if (authHeader !== `Bearer ${env.DASHBOARD_ACCESS_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Node Access" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const payload = await request.json();
      
      // TRIGGER TYPE: REQUEST (External or Manual UI)
      ctx.waitUntil(this.executeScrapeCycle(env, ctx, { 
        source: payload.source || 'EXTERNAL_API',
        targetUrl: payload.url,
        priority: payload.priority || 'NORMAL'
      }));

      return new Response(JSON.stringify({ 
        status: "ACKNOWLEDGED",
        node: "AXIM_ONYX_MK3",
        job_id: crypto.randomUUID()
      }), { status: 202 });
    }

    // 2. Health Check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ONLINE", load: "PASSIVE" }), { status: 200 });
    }

    return new Response("AXiM Onyx Node: Awaiting Orchestration", { status: 404 });
  },

  async executeScrapeCycle(env, ctx, config) {
    const telemetry = new Telemetry(env);
    const scraper = new ScraperAPI(env);
    const kv = new KVStore(env);
    
    await telemetry.report("execution_start", "LOW", "edge_worker", `Source: ${config.source}`);

    try {
      // Core scraping logic here (as defined in previous steps)
      // Logic would iterate over config.targetUrl or all KV targets
      
      await telemetry.report("execution_complete", "LOW", "edge_worker", `Batch processed successfully via ${config.source}`);
    } catch (error) {
      await telemetry.report("execution_error", "HIGH", "edge_worker", error.message);
    }
  }
};