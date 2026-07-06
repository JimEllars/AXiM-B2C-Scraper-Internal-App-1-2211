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
          await telemetry.report("CRON_END", "LOW", "edge_worker", `Cron execution finished. Records: ${metrics?.recordsProcessed || 0}, Final Cursor: ${metrics?.finalCursor || 'Unknown'}`);
        })
        .catch(async (err) => {
          await telemetry.report("CRON_END_ERROR", "HIGH", "edge_worker", `Cron execution failed: ${err.message}`);
        })
    );
  },


  async fetch(request, env, ctx) {
    const corsOrigin = env.ENVIRONMENT === 'local' ? '*' : (env.FRONTEND_URL || '*');
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
      
      // TRIGGER TYPE: REQUEST (External or Manual UI)
      ctx.waitUntil(this.executeScrapeCycle(env, ctx, { 
        source: payload.source || 'EXTERNAL_API',
        targetUrl: payload.targetUrl,
        priority: payload.priority || 'NORMAL',
        dryRun: payload.dry_run || false
      }));

      return new Response(JSON.stringify({ 
        status: "ACKNOWLEDGED",
        node: "AXIM_ONYX_MK3",
        job_id: crypto.randomUUID()
      }), { status: 202, headers: { "Access-Control-Allow-Origin": corsOrigin } });
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
      return new Response(JSON.stringify({
        status: "ONLINE",
        load: "PASSIVE",
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), parseInt(env.MAX_EXECUTION_TIME_MS || "25000"));

        response = await scraper.fetchWithEvasion(targetUrl, state.pagination_cursor, controller.signal);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Proxy rejection: HTTP ${response.status}`);
        }
      } catch (scrapeErr) {
        if (scrapeErr.name === 'AbortError') {
          await telemetry.report("timeout_error", "HIGH", "scraper_api", `Timeout exceeded for ${targetUrl}`);
        } else {
          await telemetry.report("proxy_rejection", "HIGH", "scraper_api", scrapeErr.message);
        }
        await kv.releaseLockAndCommit(egressDomainHash, state, false);
        return { recordsProcessed: 0, finalCursor: state.pagination_cursor };
      }

      let rawData;
      try {
        rawData = await response.json();
      } catch (parseError) {
        await telemetry.report("proxy_payload_parse_error", "HIGH", "scraper_api", "Failed to parse JSON response from proxy.");
        await kv.releaseLockAndCommit(egressDomainHash, state, false);
        return { recordsProcessed: 0, finalCursor: state.pagination_cursor };
      }

      if (!rawData || !rawData.records || rawData.records.length === 0) {
        await telemetry.report("dom_mapping_failed_zero_records", "HIGH", "scraper_api", `No records found for ${targetUrl}`);

        // Fallback cursor advancement
        let fallbackCursor = rawData?.next_cursor;
        if (!fallbackCursor) {
          const currentCursor = state.pagination_cursor || "page=1";
          const pageMatch = currentCursor.match(/page=(\d+)/);
          if (pageMatch) {
            const nextPage = parseInt(pageMatch[1]) + 1;
            fallbackCursor = currentCursor.replace(`page=${pageMatch[1]}`, `page=${nextPage}`);
          } else {
            fallbackCursor = currentCursor + "&page=2";
          }
        }

        await kv.releaseLockAndCommit(egressDomainHash, state, true, fallbackCursor);
        return { recordsProcessed: 0, finalCursor: fallbackCursor };
      }

      // Format & Egress
      ctx.waitUntil(
        egress.transmit(rawData.records, config.dryRun)
          .then(success => {
            if (!success) telemetry.report("egress_failure", "HIGH", "egress_bridge", "Failed to transmit payload.");
          })
          .catch(e => telemetry.report("egress_error", "HIGH", "egress_bridge", e.message))
      );

      await kv.releaseLockAndCommit(egressDomainHash, state, true, rawData.next_cursor);
      await telemetry.report("execution_complete", "LOW", "edge_worker", `Batch processed successfully via ${config.source}`);

      return { recordsProcessed: rawData.records.length, finalCursor: rawData.next_cursor };

    } catch (error) {
      await telemetry.report("execution_error", "HIGH", "edge_worker", error.message);
      return { recordsProcessed: 0, finalCursor: null };
    } finally {
      await kv.releaseSystemLock();
    }
  }
};
