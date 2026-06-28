import { ensureTab, getRows, updateRow, findRowIndexById, appendRow } from '../lib/googleSheets';

const TAB = 'Settings';
const HEADERS = ['id', 'key', 'value', 'updated_at'];

export const settingsService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:D`);
    return Object.fromEntries(rows.map(row => [row[1], row[2]]));
  },

  async update(key, value) {
    await ensureTab(TAB, HEADERS);
    const id = `setting_${key}`;
    const idx = await findRowIndexById(TAB, id);
    
    const rowData = [id, key, value, new Date().toISOString()];
    
    if (idx > 0) {
      await updateRow(`${TAB}!A${idx}:D${idx}`, rowData);
    } else {
      await appendRow(`${TAB}!A:D`, rowData);
    }
  },

  async updateBatch(settings) {
    for (const [key, value] of Object.entries(settings)) {
      await this.update(key, value);
    }
  }
};