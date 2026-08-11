const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/data';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const dataService = {
  normalizePayload(raw) {
    // Standardize to strictly pass payloads to the central AXiM Core API without redundant schema conversions
    return {
      first_name: raw.first_name || raw.Name?.split(' ')[0] || '',
      last_name: raw.last_name || raw.Name?.split(' ').slice(1).join(' ') || '',
      email: raw.email || raw.Email || '',
      phone: raw.phone || raw.Phone || '',
      address: raw.address || raw.Address || '',
      origin_url: raw.origin_url || raw.Source || ''
    };
  },

  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  },

  async ingest(batchId, source, payload) {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ batchId, source, payload })
    });
    if (!res.ok) throw new Error('Failed to ingest data');
  }
};
