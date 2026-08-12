const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/enrichment';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const enrichmentService = {
  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error('Failed to fetch enrichment logs');
      return await res.json();
    } catch (err) {
      console.warn("enrichmentService.getAll error", err);
      return [];
    }
  },

  async logEnrichment(leadId, domain, fields, score) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId, domain, fields, score })
      });
      if (!res.ok) throw new Error('Failed to log enrichment event');
    } catch (err) {
      console.warn("enrichmentService.logEnrichment error", err);
    }
  }
};
