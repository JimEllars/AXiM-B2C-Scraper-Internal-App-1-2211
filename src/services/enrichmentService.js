import { ensureTab, getRows, appendRow } from '../lib/googleSheets';

const TAB = 'EnrichmentLogs';
const HEADERS = ['id', 'lead_id', 'source_domain', 'enriched_fields', 'quality_score', 'status', 'created_at'];

export const enrichmentService = {
  async getAll() {
    await ensureTab(TAB, HEADERS);
    const rows = await getRows(`${TAB}!A2:G`);
    return rows.map(row => ({
      id: row[0],
      leadId: row[1],
      domain: row[2],
      fields: row[3].split(','),
      score: parseFloat(row[4] || '0'),
      status: row[5],
      time: new Date(row[6])
    })).reverse();
  },

  async logEnrichment(leadId, domain, fields, score) {
    await ensureTab(TAB, HEADERS);
    const entry = [
      crypto.randomUUID(),
      leadId,
      domain,
      fields.join(','),
      score.toString(),
      'COMPLETED',
      new Date().toISOString()
    ];
    await appendRow(`${TAB}!A:G`, entry);
  }
};