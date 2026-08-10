import { createClient } from '@supabase/supabase-js';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/telemetry';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

export const telemetryService = {
  connectionMode: 'UNKNOWN', // 'LIVE EDGE' | 'LOCAL DEMO' | 'UNKNOWN'

  async checkConnection() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      this.connectionMode = res.ok ? 'LIVE EDGE' : 'LOCAL DEMO';
    } catch (e) {
      this.connectionMode = 'LOCAL DEMO';
    }
    return this.connectionMode;
  },

  async getAll() {
    try {
      const res = await fetch(WORKER_URL, { headers });
      if (!res.ok) throw new Error('Failed to fetch telemetry');
      this.connectionMode = 'LIVE EDGE';
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Falling back to local demo mode for telemetry", e);
      this.connectionMode = 'LOCAL DEMO';
      return [];
    }
  },

  async log(level, message, module, traceId = null) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: level || 'info', // 'info' | 'warn' | 'error'
      module: module || 'unknown',
      message,
      traceId: traceId || crypto.randomUUID()
    };

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to log telemetry to edge');
      this.connectionMode = 'LIVE EDGE';
    } catch (e) {
      console.warn("Failed to log telemetry to edge, using local mode", e);
      this.connectionMode = 'LOCAL DEMO';
      // Local fallback happens via subscribe simulator
    }
  },

  subscribe(callback, onStateChange = null) {
    let active = true;
    let lastSeenIds = new Set();

    // Attempt real polling from worker
    const pollInterval = setInterval(async () => {
       if (!active) return;
       try {
         const res = await fetch(WORKER_URL, { headers });
         if (res.ok) {
           this.connectionMode = 'LIVE EDGE';
           if (onStateChange) onStateChange('LIVE EDGE');
           const logs = await res.json();
           if (Array.isArray(logs) && logs.length > 0) {
             logs.forEach(log => {
               if (!lastSeenIds.has(log.id)) {
                 lastSeenIds.add(log.id);
                 callback(log);
               }
             });
             if (lastSeenIds.size > 2000) lastSeenIds.clear(); // prevent memory leak
           }
         } else {
             throw new Error('Fallback to local');
         }
       } catch (e) {
           this.connectionMode = 'LOCAL DEMO';
           if (onStateChange) onStateChange('LOCAL DEMO');
       }
    }, 2000);

    // Simulated local ticks for fallback
    const localTickInterval = setInterval(() => {
        if (!active || this.connectionMode === 'LIVE EDGE') return;

        const localLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
          module: 'LOCAL_SIMULATOR',
          message: 'Simulated edge node telemetry ping',
          traceId: crypto.randomUUID()
        };
        callback(localLog);
    }, 5000);

    return () => {
      active = false;
      clearInterval(pollInterval);
      clearInterval(localTickInterval);
    };
  }
};
