import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiShield, FiUser, FiActivity, FiLoader, FiSearch, FiCalendar } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { auditService } from '../services/auditService';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let active = true;
    const loadLogs = async () => {
      try {
        const data = await auditService.getAll();
        if (active) setLogs(data);
      } catch (err) {
        console.error('Audit load failed', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => {
        active = false;
        clearInterval(interval);
    }
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.component.toLowerCase().includes(searchTerm.toLowerCase());

    let matchDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.time);
      if (startDate) matchDate = matchDate && logDate >= new Date(startDate);
      if (endDate) matchDate = matchDate && logDate <= new Date(endDate);
    }

    return matchSearch && matchDate;
  });

  if (loading && logs.length === 0) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Audit & Compliance</h2>
          <p className="text-sm text-gray-400">Restricted ledger of all administrative and orchestration events.</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div className="relative">
          <input 
            type="text"
            placeholder="Search audit trail..."
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
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Event</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Node/Component</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      <SafeIcon icon={FiShield} className="w-3 h-3 text-indigo-400" />
                    </div>
                    <span className="text-sm text-gray-200">{log.action}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <SafeIcon icon={FiUser} className="w-3 h-3" />
                    <span>{log.actor}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-mono bg-gray-950 px-2 py-1 rounded border border-gray-800 text-gray-500">
                    {log.component}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-xs text-gray-500 font-mono">
                  {format(new Date(log.time), 'MMM dd, HH:mm:ss')}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
                <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500 text-sm">No audit logs found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
