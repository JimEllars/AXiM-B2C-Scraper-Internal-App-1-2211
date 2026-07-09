const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/queue';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const queueService = {
  async getAll() {
    const res = await fetch(WORKER_URL, { headers });
    if (!res.ok) throw new Error('Failed to fetch queue');
    return res.json();
  },

  async enqueue(url, priority = 'NORMAL') {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, priority })
    });
    if (!res.ok) throw new Error('Failed to enqueue target');
  },

  async updateStatus(id, status, error = '') {
    const res = await fetch(`${WORKER_URL}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, error })
    });
    if (!res.ok) throw new Error('Failed to update queue status');
  },

  async clearCompleted() {
    const res = await fetch(`${WORKER_URL}/completed`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to clear completed items from queue');
  }
};
