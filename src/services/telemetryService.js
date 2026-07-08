const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/telemetry';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const telemetryService = {
  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (!res.ok) throw new Error('Failed to fetch telemetry');
      return await res.json();
    } catch (e) {
      console.error("Failed to fetch telemetry", e);
      return [];
    }
  },

  async log(type, message, origin) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, message, origin })
      });
      if (!res.ok) throw new Error('Failed to log telemetry');
    } catch (e) {
      console.error("Failed to log telemetry", e);
    }
  }
};
