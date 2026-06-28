import { ensureTab, getRows, updateRow, findRowIndexById, appendRow } from '../lib/googleSheets';

const TAB = 'ProxyNodes';
const HEADERS = ['id', 'provider', 'region', 'status', 'latency', 'success_rate', 'updated_at'];

export const proxyService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:G`);
    if (rows.length === 0) {
      // Bootstrap with default enterprise rotators if empty
      const defaults = [
        [crypto.randomUUID(), 'ScraperAPI-US', 'US-EAST-1', 'Active', '142ms', '99.2%', new Date().toISOString()],
        [crypto.randomUUID(), 'BrightData-EU', 'EU-WEST-1', 'Active', '189ms', '98.5%', new Date().toISOString()],
        [crypto.randomUUID(), 'Oxylabs-Global', 'GLOBAL-RES', 'Degraded', '450ms', '82.1%', new Date().toISOString()]
      ];
      for (const row of defaults) await appendRow(`${TAB}!A:G`, row);
      return defaults.map(r => ({ id: r[0], provider: r[1], region: r[2], status: r[3], latency: r[4], successRate: r[5] }));
    }
    return rows.map(row => ({
      id: row[0],
      provider: row[1],
      region: row[2],
      status: row[3],
      latency: row[4],
      successRate: row[5]
    }));
  }
};