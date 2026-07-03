/**
 * KV State Management Ledger
 * Handles Cloudflare KV locks and pagination state.
 */
export class KVStore {
  constructor(env) {
    this.kv = env.B2C_SCRAPER_STATE;
  }

  async getTargetState(domainHash) {
    if (!this.kv) return null; // Defensive check

    const key = `target_state:${domainHash}`;
    const data = await this.kv.get(key, "json");

    // Return structured default state if empty
    if (!data) {
      return {
        status: "IDLE",
        lock_expires_at: null,
        pagination_cursor: null,
        last_successful_run: null,
        metrics: {
          total_records_extracted: 0,
          consecutive_failures: 0
        }
      };
    }

    return data;
  }

  async acquireLock(domainHash, state) {
    if (!this.kv) return true; // Fail open if no KV configured

    const key = `target_state:${domainHash}`;
    const now = Date.now();
    
    if (state.status === "RUNNING" && state.lock_expires_at && state.lock_expires_at > now) {
      return false; // Lock is currently held by another worker
    }

    state.status = "RUNNING";
    state.lock_expires_at = now + (3 * 60 * 1000); // 3 minutes in the future
    await this.kv.put(key, JSON.stringify(state));
    return true;
  }


  async getAllStates() {
    if (!this.kv) return [];

    let allKeys = [];
    let cursor = null;
    let complete = false;

    while (!complete) {
      const result = await this.kv.list({ prefix: "target_state:", cursor });
      allKeys.push(...result.keys);
      complete = result.list_complete;
      if (!complete) cursor = result.cursor;
    }

    const states = [];
    for (const key of allKeys) {
      const data = await this.kv.get(key.name, "json");
      if (data) {
        states.push({ key: key.name.replace("target_state:", ""), ...data });
      }
    }

    return states;
  }

  async releaseLockAndCommit(domainHash, state, success, newCursor = null) {
    if (!this.kv) return; // Fail open if no KV

    const key = `target_state:${domainHash}`;
    state.status = "IDLE";
    state.lock_expires_at = null;
    
    if (success) {
      state.pagination_cursor = newCursor || state.pagination_cursor;
      state.last_successful_run = new Date().toISOString();
      state.metrics.total_records_extracted += 1;
      state.metrics.consecutive_failures = 0;
    } else {
      state.metrics.consecutive_failures += 1;
    }

    await this.kv.put(key, JSON.stringify(state));
  }
}
