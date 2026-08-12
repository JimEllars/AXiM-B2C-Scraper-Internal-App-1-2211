const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/proxies';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const proxyService = {
  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error('Failed to fetch proxies');
      return await res.json();
    } catch (err) {
      console.warn("proxyService.getAll error", err);
      return [];
    }
  },

  async create(proxy) {
    try {
      proxy.status = 'TestingHandshake';
      proxy.latency = '---';
      proxy.successRate = '0%';
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(proxy)
      });
      if (!res.ok) throw new Error('Failed to create proxy');
    } catch (err) {
      console.warn("proxyService.create error", err);
      throw err;
    }
  }
};
