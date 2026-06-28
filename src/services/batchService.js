import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'Batches';
const HEADERS = ['id', 'target', 'records', 'status', 'error', 'bridge_id', 'created_at'];

export const batchService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:G`);
    return rows.map(row => ({
      id: row[0],
      target: row[1],
      records: parseInt(row[2] || '0'),
      status: row[3],
      error: row[4],
      bridge_id: row[5],
      time: new Date(row[6])
    })).reverse(); // Latest first
  },

  async log(batch) {
    await ensureTab(TAB, HEADERS);
    const newBatch = [
      batch.id || `bch_${Math.random().toString(36).substr(2, 4)}`,
      batch.target,
      batch.records.toString(),
      batch.status,
      batch.error || '',
      batch.bridge_id || '',
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:G`, newBatch);
  }
};