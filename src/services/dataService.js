import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'ExtractedData';
const HEADERS = ['id', 'batch_id', 'source_url', 'payload_json', 'created_at'];

export const dataService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:E`);
    return rows.map(row => ({
      id: row[0],
      batchId: row[1],
      source: row[2],
      payload: JSON.parse(row[3] || '{}'),
      time: new Date(row[4])
    })).reverse();
  },

  async ingest(batchId, source, payload) {
    await ensureTab(TAB, HEADERS);
    const entry = [
      crypto.randomUUID(),
      batchId,
      source,
      JSON.stringify(payload),
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:E`, entry);
  }
};