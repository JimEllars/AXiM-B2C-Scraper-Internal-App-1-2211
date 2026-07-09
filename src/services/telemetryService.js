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

  subscribe(callback) {
    const channel = supabase
      .channel('axim_telemetry_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'axim_telemetry_stream' },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to axim_telemetry_stream channel.');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to axim_telemetry_stream channel.');
        } else if (status === 'TIMED_OUT') {
          console.error('Subscription to axim_telemetry_stream channel timed out.');
        } else if (status === 'CLOSED') {
          console.log('Subscription to axim_telemetry_stream channel closed.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
