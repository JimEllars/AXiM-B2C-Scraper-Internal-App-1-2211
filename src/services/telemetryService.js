import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'Telemetry';
const HEADERS = ['id', 'type', 'message', 'origin', 'created_at'];

export const telemetryService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:E`);
    return rows.map(row => ({
      id: row[0],
      type: row[1],
      message: row[2],
      origin: row[3],
      time: new Date(row[4])
    })).reverse();
  },

  async log(type, message, origin) {
    await ensureTab(TAB, HEADERS);
    const entry = [
      crypto.randomUUID(),
      type,
      message,
      origin,
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:E`, entry);
  }
};