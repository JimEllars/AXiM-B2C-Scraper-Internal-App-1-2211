const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/settings';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const settingsService = {
  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async update(key, value) {
    const res = await fetch(WORKER_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ key, value })
    });
    if (!res.ok) throw new Error('Failed to update setting');
  },

  async updateBatch(settings) {
    for (const [key, value] of Object.entries(settings)) {
      await this.update(key, value);
    }
  }
};
