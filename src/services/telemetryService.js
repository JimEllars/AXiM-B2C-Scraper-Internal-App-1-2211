import { createClient } from '@supabase/supabase-js';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/telemetry';
const TOKEN = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  },

  subscribe(callback, onStateChange = null) {
    let channel;
    let reconnectTimer;
    let attempt = 0;

    const connect = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      if (onStateChange) onStateChange('CONNECTING');

      channel = supabase
        .channel('axim_telemetry_stream')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'axim_telemetry_stream' },
          (payload) => {
            callback(payload.new);
          }
        )
        .subscribe((status, err) => {
          if (onStateChange) onStateChange(status);

          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to axim_telemetry_stream channel.');
            attempt = 0; // reset backoff
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error(`Subscription to axim_telemetry_stream channel issue: ${status}`, err);
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            attempt++;
            console.log(`Reconnecting in ${delay}ms...`);
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, delay);
          }
        });
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }
};
