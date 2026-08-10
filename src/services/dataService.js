const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/data';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const dataService = {
  normalizePayload(raw) {
    return {
      first_name: raw.Name?.split(' ')[0] || raw.first_name || '',
      last_name: raw.Name?.split(' ').slice(1).join(' ') || raw.last_name || '',
      email: raw.Email || raw.email || '',
      phone: raw.Phone || raw.phone || '',
      address: raw.Address || raw.address || '',
      origin_url: raw.Source || raw.origin_url || ''
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
