const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/audit';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const auditService = {
  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async log(action, actor = 'SYSTEM_ADMIN', component = 'CORE', status = 'SUCCESS') {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, actor, component, status })
    });
    if (!res.ok) throw new Error('Failed to log audit event');
  }
};
