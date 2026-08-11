import { Telemetry } from '../utils/telemetry.js';
/**
 * Data Mapping & Schema Contract
 * Formats extracted DOM data and transmits to Omni-Channel CRM Enrichment Bridge.
 */
export class Egress {
  constructor(env) {
    this.env = env;
  }

  async generateHash(url, email) {
    const text = `${url}:${email}`;
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async validateAndFormatRecord(rawRecord) {
    // Fallback Matrix: Missing Email AND Missing Phone -> DROP
    const hasEmail = rawRecord.email && rawRecord.email.trim() !== '';
    const hasPhone = rawRecord.phone && rawRecord.phone.trim() !== '';
    if (!hasEmail && !hasPhone) return null;

    const lead_id = await this.generateHash(rawRecord.origin_url, rawRecord.email || rawRecord.phone);

    return {
      lead_id,
      contact_data: {
        raw_first_name: rawRecord.firstName ? rawRecord.firstName.trim() : null, // Missing name -> PASS AS null
        raw_last_name: rawRecord.lastName ? rawRecord.lastName.trim() : null,
        raw_email: rawRecord.email ? rawRecord.email.trim() : null, // Invalid email format -> PASS AS EXTRACTED
        raw_phone: rawRecord.phone ? rawRecord.phone.trim() : null
      },
      location_data: {
        raw_city: rawRecord.city ? rawRecord.city.trim() : null, // Missing location -> PASS AS null
        raw_state: rawRecord.state ? rawRecord.state.trim() : null,
        raw_zip: rawRecord.zip ? rawRecord.zip.trim() : null
      },
      acquisition_metadata: {
        origin_url: rawRecord.origin_url,
        scrape_timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * IMPORTANT: This method should be called within ctx.waitUntil()
   * to ensure background egress completes successfully after the
   * worker responds to the trigger.
   */
  async transmit(records, isDryRun = false, runId = null) {
    const trimmedRecords = records.map(rec => {
      const trimmed = {};
      for (const [key, value] of Object.entries(rec)) {
        if (key === 'phone' && typeof value === 'string') {
          // Normalize phone number by stripping all non-numeric characters
          trimmed[key] = value.replace(/\D/g, '');
        } else {
          trimmed[key] = typeof value === 'string' ? value.trim() : value;
        }
      }
      return trimmed;
    });

    const validRecords = [];
    for (const rec of trimmedRecords) {
      const formatted = await this.validateAndFormatRecord(rec);
      if (formatted) validRecords.push(formatted);
    }

    if (validRecords.length === 0) return true; // Nothing to send, but not an error

    const payload = {
      source: "AXIM_INTERNAL_B2C_SCRAPER",
      batch_id: runId || crypto.randomUUID(),
      records: validRecords
    };

    if (isDryRun) {
      const telemetry = new Telemetry(this.env);
      await telemetry.report("DRY_RUN_PAYLOAD", "INFO", "egress_bridge", `Dry Run Egress Payload: ${JSON.stringify(payload)}`);
      return true;
    }

    const maxRetries = 3;
    let attempt = 0;
    const baseDelay = 1000;

    while (attempt < maxRetries) {
      try {
        const controller = new AbortController();
        // Set timeout to 10s max for circuit breaker
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(this.env.ENRICHMENT_BRIDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.env.AXIM_INTERNAL_KEY}`,
            "X-AXiM-Source": "AXiM-B2C-Scraper"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status >= 500) {
          const telemetry = new Telemetry(this.env);
          await telemetry.report("EGRESS_HTTP_ERROR", "WARN", "egress_bridge", `Egress network error ${response.status} (Attempt ${attempt + 1}/${maxRetries})`);

          // Exponential backoff with jitter
          const jitter = Math.floor(Math.random() * 500);
          const delay = (baseDelay * Math.pow(2, attempt)) + jitter;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        return response.status === 202 || response.status === 200;
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) {
          const telemetry = new Telemetry(this.env);
          // Only report error, do not throw. This prevents freezing the queue/orchestrator loop
          // and dropping active sessions for the UI.
          await telemetry.report("EGRESS_CIRCUIT_OPEN", "HIGH", "egress_bridge", `Circuit Breaker Open after ${maxRetries} failed attempts: ${e.message}`);
          return false;
        }
        const telemetry = new Telemetry(this.env);
        await telemetry.report("EGRESS_TIMEOUT_RETRY", "WARN", "egress_bridge", `Egress network timeout (Attempt ${attempt}/${maxRetries})`);
        const jitter = Math.floor(Math.random() * 500);
        const delay = (baseDelay * Math.pow(2, attempt)) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
