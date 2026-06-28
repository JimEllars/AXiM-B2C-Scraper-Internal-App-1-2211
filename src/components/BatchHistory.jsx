import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiHash, FiClock, FiFileText, FiCheckCircle, FiExternalLink, FiLoader } from 'react-icons/fi';
import { format } from 'date-fns';
import { batchService } from '../services/batchService';

export default function BatchHistory() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const data = await batchService.getAll();
      setBatches(data);
    } catch (err) {
      console.error('Failed to load batches', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Batch Execution History</h2>
          <p className="text-sm text-gray-400">Immutable ledger of all data egress events via the Enrichment Bridge.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
          <SafeIcon icon={FiHash} className="w-3 h-3" />
          <span>KV_LEDGER: B2C_SYNC_LOGS</span>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-800">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Batch ID</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target Domain</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Records</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bridge Sync</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-indigo-400">{batch.id}</td>
                <td className="px-6 py-4 text-sm text-gray-300 truncate max-w-[200px]">{batch.target}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-white">{batch.records}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${batch.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`text-xs font-medium ${batch.status === 'COMPLETED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {batch.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {batch.bridge_id ? (
                    <div className="flex items-center space-x-2 text-gray-500 group-hover:text-indigo-400 transition-colors cursor-pointer">
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                      <span className="text-xs font-mono">{batch.bridge_id}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600 font-mono">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-xs text-gray-500 font-mono">
                  {format(new Date(batch.time), 'MMM dd, HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}