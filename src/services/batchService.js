const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/batches';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const batchService = {
  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch batches');
    return res.json();
  },

  async log(batch) {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch)
    });
    if (!res.ok) throw new Error('Failed to log batch');
  }
};
