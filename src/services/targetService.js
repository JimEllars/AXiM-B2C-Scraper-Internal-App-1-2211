
const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/targets';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const targetService = {
  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch targets');
    return res.json();
  },

  async create(target) {
    const newTarget = {
      id: crypto.randomUUID(),
      url: target.url,
      status: 'IDLE',
      cursor: 'page=1&offset=0',
      lastRun: 'Never',
      records: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(newTarget)
    });
    if (!res.ok) throw new Error('Failed to create target');
    return newTarget;
  },

  async toggleStatus(id) {
    const targets = await this.getAll();
    const target = targets.find(t => t.id === id);
    if (!target) return;

    const newStatus = target.status === 'RUNNING' ? 'IDLE' : 'RUNNING';
    const updated = {
       id,
       status: newStatus,
       updated_at: new Date().toISOString()
    };

    const res = await fetch(WORKER_URL, {
       method: 'PUT',
       headers,
       body: JSON.stringify(updated)
    });
    
    if (!res.ok) throw new Error('Failed to update target');
    return newStatus;
  },

  async remove(id) {
    const url = new URL(WORKER_URL);
    url.searchParams.append('id', id);
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to delete target');
    return true;
  }
};
