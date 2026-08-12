#!/bin/bash

# Update dataService.js
cat << 'INNER_EOF' > src/services/dataService.js
const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/data';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const dataService = {
  normalizePayload(raw) {
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
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error('Failed to fetch data');
      return await res.json();
    } catch (err) {
      console.warn("dataService.getAll error", err);
      return [];
    }
  },

  async ingest(batchId, source, payload) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ batchId, source, payload })
      });
      if (!res.ok) throw new Error('Failed to ingest data');
    } catch (err) {
      console.warn("dataService.ingest error", err);
    }
  }
};
INNER_EOF

# Update proxyService.js
cat << 'INNER_EOF' > src/services/proxyService.js
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
INNER_EOF

# Update settingsService.js
cat << 'INNER_EOF' > src/services/settingsService.js
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
INNER_EOF

# Update enrichmentService.js
cat << 'INNER_EOF' > src/services/enrichmentService.js
const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/enrichment';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const enrichmentService = {
  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error('Failed to fetch enrichment logs');
      return await res.json();
    } catch (err) {
      console.warn("enrichmentService.getAll error", err);
      return [];
    }
  },

  async logEnrichment(leadId, domain, fields, score) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId, domain, fields, score })
      });
      if (!res.ok) throw new Error('Failed to log enrichment event');
    } catch (err) {
      console.warn("enrichmentService.logEnrichment error", err);
    }
  }
};
INNER_EOF
