import { ensureTab, getRows, appendRow, updateRow, findRowIndexById, deleteRow } from '../lib/googleSheets';

const TAB = 'JobQueue';
const HEADERS = ['id', 'target_url', 'priority', 'status', 'attempts', 'last_error', 'created_at'];

export const queueService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:G`);
    return rows.map(row => ({
      id: row[0],
      url: row[1],
      priority: row[2],
      status: row[3],
      attempts: parseInt(row[4] || '0'),
      lastError: row[5],
      createdAt: new Date(row[6])
    })).reverse();
  },

  async enqueue(url, priority = 'NORMAL') {
    await ensureTab(TAB, HEADERS);
    const entry = [
      crypto.randomUUID(),
      url,
      priority,
      'PENDING',
      '0',
      '',
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:G`, entry);
  },

  async updateStatus(id, status, error = '') {
    const idx = await findRowIndexById(TAB, id);
    if (idx < 0) return;
    const rows = await getRows(`${TAB}!A${idx}:G${idx}`);
    const updated = [...rows[0]];
    updated[3] = status;
    updated[5] = error;
    if (status === 'FAILED') updated[4] = (parseInt(updated[4]) + 1).toString();
    await updateRow(`${TAB}!A${idx}:G${idx}`, updated);
  },

  async clearCompleted() {
    const rows = await this.getAll();
    for (const row of rows) {
      if (row.status === 'COMPLETED') {
        await deleteRow(TAB, row.id);
      }
    }
  }
};