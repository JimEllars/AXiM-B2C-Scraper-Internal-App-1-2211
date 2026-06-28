import React from 'react';
import { FiCode, FiDatabase, FiShield } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

export default function SchemaViewer() {
  const schema = {
    "sync_envelope": {
      "batch_id": "uuid-v4",
      "source_node": "AXIM_INTERNAL_B2C_SCRAPER",
      "timestamp": "ISO-8601",
      "total_records": "Integer"
    },
    "records": [
      {
        "lead_id": "sha1(url + email)",
        "contact_data": {
          "raw_first_name": "String | null",
          "raw_last_name": "String | null",
          "raw_email": "String | null",
          "raw_phone": "String | null"
        },
        "location_data": {
          "raw_city": "String | null",
          "raw_state": "String | null",
          "raw_zip": "String | null"
        },
        "acquisition_metadata": {
          "origin_url": "URL",
          "scrape_timestamp": "ISO-8601"
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Data Egress Schema</h2>
        <p className="text-sm text-gray-400">Strict structural contract for the Enrichment Bridge handshake.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 bg-gray-950/80">
          <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-4">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiCode} className="text-indigo-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">JSON Contract Model v1.2</span>
            </div>
            <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
              Copy Schema
            </button>
          </div>
          <pre className="text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 bg-indigo-500/5 border-indigo-500/10">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiShield} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Validation Rules</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                <span>Primary Key: <code>lead_id</code> must be consistent for deduplication.</span>
              </li>
              <li className="flex items-start space-x-3 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                <span>Contact Requirement: Must have <code>raw_email</code> OR <code>raw_phone</code>.</span>
              </li>
              <li className="flex items-start space-x-3 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                <span>Whitespace: All strings must be <code>.trim()</code> before transmission.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-6 bg-gray-900 border-gray-800">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiDatabase} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Storage Strategy</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Records are not stored locally. They are held in memory during the worker lifecycle and purged immediately after the <code>202 Accepted</code> handshake.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}