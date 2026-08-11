/**
 * Telemetry & Onyx Mk3 Integration
 * Maps timeouts, empty payloads, or proxy rejections to central AXiM telemetry gateway.
 */
export class Telemetry {
  constructor(env) {
    this.env = env;
    this.projectId = "AXIM_B2C_SCRAPER";
    this.kv = env.B2C_SCRAPER_STATE;
  }

  async report(eventType, severity, componentOrigin, errorMessage, extraPayload = {}) {
    const timestamp = new Date().toISOString();
    const payload = {
      telemetry_envelope: {
        project_id: this.projectId,
        environment: this.env.ENVIRONMENT || "production",
        timestamp: timestamp
      },
      event_payload: {
        event_type: eventType,
        severity: severity, // "HIGH", "MEDIUM", "LOW"
        component_origin: componentOrigin,
        error_message: errorMessage,
        ...extraPayload
      }
    };

    // Log locally to KV for dashboard streaming
    if (this.kv) {
      try {
        const today = timestamp.split('T')[0];
        const key = `telemetry:${today}`;

        let logs = [];
        const existingLogs = await this.kv.get(key);
        if (existingLogs) {
          logs = JSON.parse(existingLogs);
        }

        // Push standardized UI format log
        logs.push({
          id: crypto.randomUUID(),
          timestamp: timestamp,
          level: severity === "HIGH" ? "error" : (severity === "MEDIUM" ? "warn" : "info"),
          module: componentOrigin,
          message: `${eventType}: ${errorMessage}`,
          traceId: extraPayload.runId || crypto.randomUUID(),
          raw_type: eventType
        });

        // Cap at 1000 logs per day to avoid KV max value size limits
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }

        // 7 day TTL (604800 seconds)
        await this.kv.put(key, JSON.stringify(logs), { expirationTtl: 604800 });
      } catch (kvError) {
        console.error("Failed to write telemetry to KV", kvError);
      }
    }

    try {
      await fetch(this.env.TELEMETRY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.env.AXIM_INTERNAL_KEY}`
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("CRITICAL: Failed to dispatch telemetry to Onyx Mk3.", e);
    }
  }
}
