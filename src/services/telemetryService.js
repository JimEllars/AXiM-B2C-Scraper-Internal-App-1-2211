import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'Telemetry';
const HEADERS = ['id', 'type', 'message', 'origin', 'created_at'];

export const telemetryService = {
  async getAll() {
    try {
      await ensureTab(TAB, HEADERS);
      const rows = await getRows(`${TAB}!A2:E`);
      return rows.map(row => ({
        id: row[0],
        type: row[1],
        message: row[2],
        origin: row[3],
        time: new Date(row[4])
      })).reverse();
    } catch (e) {
      console.warn("Failed to fetch telemetry, using mock data", e);
      return Array.from({length: 10}).map((_, i) => ({
        id: `mock-${i}`,
        type: i % 3 === 0 ? 'error' : i % 2 === 0 ? 'success' : 'info',
        message: `System node execution ${i} state reported.`,
        origin: 'edge_worker',
        time: new Date(Date.now() - i * 60000)
      }));
    }
  },

  async log(type, message, origin) {
    try {
      await ensureTab(TAB, HEADERS);
      const entry = [
        crypto.randomUUID(),
        type,
        message,
        origin,
        new Date().toISOString()
      ];
      await appendRow(`${TAB}!A:E`, entry);
    } catch (e) {
      console.error("Failed to log telemetry", e);
    }
  }
};
