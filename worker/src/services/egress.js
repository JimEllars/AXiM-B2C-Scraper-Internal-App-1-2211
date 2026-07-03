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
    if (!rawRecord.email && !rawRecord.phone) return null;

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
  async transmit(records) {
    const validRecords = [];
    for (const rec of records) {
      const formatted = await this.validateAndFormatRecord(rec);
      if (formatted) validRecords.push(formatted);
    }

    if (validRecords.length === 0) return true; // Nothing to send, but not an error

    const payload = {
      source: "AXIM_INTERNAL_B2C_SCRAPER",
      batch_id: crypto.randomUUID(),
      records: validRecords
    };

    try {
      let response = await fetch(this.env.ENRICHMENT_BRIDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.env.AXIM_INTERNAL_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        console.warn("Egress Rate Limit Hit (429). Initiating backoff...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        response = await fetch(this.env.ENRICHMENT_BRIDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.env.AXIM_INTERNAL_KEY}`
          },
          body: JSON.stringify(payload)
        });
      }

      return response.status === 202; // Bridge Acknowledgment
    } catch (e) {
      console.error("Critical Egress Failure:", e);
      throw e; // Let index.js handle the telemetry report
    }
  }
}
