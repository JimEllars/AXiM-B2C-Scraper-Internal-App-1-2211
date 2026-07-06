/**
 * Telemetry & Onyx Mk3 Integration
 * Maps timeouts, empty payloads, or proxy rejections to central AXiM telemetry gateway.
 */
export class Telemetry {
  constructor(env) {
    this.env = env;
    this.projectId = "AXIM_B2C_SCRAPER";
  }

  async report(eventType, severity, componentOrigin, errorMessage, extraPayload = {}) {
    const payload = {
      telemetry_envelope: {
        project_id: this.projectId,
        environment: this.env.ENVIRONMENT || "production",
        timestamp: new Date().toISOString()
      },
      event_payload: {
        event_type: eventType,
        severity: severity, // "HIGH", "MEDIUM", "LOW"
        component_origin: componentOrigin,
        error_message: errorMessage,
        ...extraPayload
      }
    };

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