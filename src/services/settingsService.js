const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/settings';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const settingsService = {
  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (res.status === 404) return {};
      if (!res.ok) throw new Error('Failed to fetch settings');
      return await res.json();
    } catch (err) {
      console.warn("settingsService.getAll error", err);
      return {};
    }
  },

  async update(key, value) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) throw new Error('Failed to update setting');
    } catch (err) {
      console.warn("settingsService.update error", err);
      throw err;
    }
  },

  async updateBatch(settings) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        // Fallback to individual updates if batch PUT fails
        for (const [key, value] of Object.entries(settings)) {
          await this.update(key, value);
        }
      }
    } catch (err) {
      console.warn("settingsService.updateBatch error", err);
      throw err;
    }
  }
};
