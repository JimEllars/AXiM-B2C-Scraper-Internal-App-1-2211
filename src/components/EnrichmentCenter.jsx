import React, { useState, useEffect } from 'react';
import { FiZap, FiCheckShield, FiUserPlus, FiLoader, FiFilter, FiExternalLink } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { enrichmentService } from '../services/enrichmentService';
import { format } from 'date-fns';

export default function EnrichmentCenter() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      const data = await enrichmentService.getAll();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">B2C Enrichment Engine</h2>
          <p className="text-sm text-gray-400">Augmenting raw B2C extractions with social and professional identity data.</p>
        </div>
        <div className="flex space-x-2">
          <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-mono text-indigo-400">
            ENGINE_V2_ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-4 bg-emerald-500/5 border-emerald-500/10">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Avg. Quality Score</p>
          <p className="text-2xl font-bold text-white font-mono">8.42<span className="text-xs text-emerald-400 ml-1">/10</span></p>
        </div>
        <div className="glass-panel p-4 bg-indigo-500/5 border-indigo-500/10">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Enrichment Depth</p>
          <p className="text-2xl font-bold text-white font-mono">92.4%</p>
        </div>
        <div className="glass-panel p-4 bg-amber-500/5 border-amber-500/10">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Identity Matches</p>
          <p className="text-2xl font-bold text-white font-mono">14,209</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lead Hash</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Source Domain</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Enriched Fields</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quality</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Processed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800/20 transition-colors group">
                <td className="px-6 py-4 text-indigo-400 truncate max-w-[120px]">{log.leadId}</td>
                <td className="px-6 py-4 text-gray-400">{log.domain}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {log.fields.map((f, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-gray-950 border border-gray-800 text-[9px] text-gray-500 group-hover:text-indigo-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-gray-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${log.score * 10}%` }} />
                    </div>
                    <span className="text-gray-300">{log.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">
                  {format(log.time, 'HH:mm:ss')}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-600 font-sans text-sm">
                  Waiting for raw extractions to hit the enrichment buffer...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}