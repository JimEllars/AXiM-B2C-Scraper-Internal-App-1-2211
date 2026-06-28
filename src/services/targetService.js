import { ensureTab, getRows, appendRow, updateRow, findRowIndexById, deleteRow } from '../lib/googleSheets';

const TAB = 'Targets';
const HEADERS = ['id', 'url', 'status', 'cursor', 'last_run', 'records', 'created_at', 'updated_at'];

export const targetService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:H`);
    return rows.map(row => ({
      id: row[0],
      url: row[1],
      status: row[2],
      cursor: row[3],
      lastRun: row[4],
      records: parseInt(row[5] || '0'),
      created_at: row[6],
      updated_at: row[7]
    }));
  },

  async create(target) {
    await ensureTab(TAB, HEADERS);
    const newTarget = [
      crypto.randomUUID(),
      target.url,
      'IDLE',
      'page=1&offset=0',
      'Never',
      '0',
      new Date().toISOString(),
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:H`, newTarget);
    return newTarget;
  },

  async toggleStatus(id) {
    const idx = await findRowIndexById(TAB, id);
    if (idx < 0) return;
    const rows = await getRows(`${TAB}!A${idx}:H${idx}`);
    if (!rows.length) return;
    
    const updatedRow = [...rows[0]];
    updatedRow[2] = updatedRow[2] === 'RUNNING' ? 'IDLE' : 'RUNNING';
    updatedRow[7] = new Date().toISOString();
    await updateRow(`${TAB}!A${idx}:H${idx}`, updatedRow);
    return updatedRow[2];
  },

  async remove(id) {
    return await deleteRow(TAB, id);
  }
};