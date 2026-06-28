import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'AuditLogs';
const HEADERS = ['id', 'action', 'actor', 'component', 'ip_address', 'status', 'created_at'];

export const auditService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:G`);
    return rows.map(row => ({
      id: row[0],
      action: row[1],
      actor: row[2],
      component: row[3],
      ip: row[4],
      status: row[5],
      time: new Date(row[6])
    })).reverse();
  },

  async log(action, actor = 'SYSTEM_ADMIN', component = 'CORE', status = 'SUCCESS') {
    await ensureTab(TAB, HEADERS);
    const entry = [
      crypto.randomUUID(),
      action,
      actor,
      component,
      '127.0.0.1', // Simulated IP
      status,
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:G`, entry);
  }
};