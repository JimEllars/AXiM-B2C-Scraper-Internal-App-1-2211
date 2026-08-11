import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiHash, FiClock, FiFileText, FiCheckCircle, FiExternalLink, FiLoader, FiSearch, FiCalendar } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { batchService } from '../services/batchService';

export default function BatchHistory() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let active = true;
    const loadBatches = async () => {
      try {
        const data = await batchService.getAll();
        if (active) setBatches(data);
      } catch (err) {
        console.error('Failed to load batches', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadBatches();
    const interval = setInterval(loadBatches, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const filteredBatches = batches.filter(batch => {
    const matchSearch = batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        batch.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (batch.bridge_id && batch.bridge_id.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchDate = true;
    if (startDate || endDate) {
      const batchDate = new Date(batch.time);
      if (startDate) matchDate = matchDate && batchDate >= new Date(startDate);
      if (endDate) matchDate = matchDate && batchDate <= new Date(endDate);
    }

    return matchSearch && matchDate;
  });

  if (loading && batches.length === 0) {
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

      <div className="flex items-center space-x-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-300 focus:border-indigo-500 outline-none w-64"
          />
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
        </div>
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiCalendar} className="text-gray-500 w-4 h-4" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none" />
          <span className="text-gray-500">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none" />
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
            {filteredBatches.map((batch) => (
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
            {filteredBatches.length === 0 && (
                <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-sm">No batch records found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
