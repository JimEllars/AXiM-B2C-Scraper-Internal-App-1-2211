import React, { useState, useEffect } from 'react';
import SafeIcon from '../common/SafeIcon';
import { FiPlus, FiPlay, FiPause, FiLoader, FiTrash2, FiZap, FiSearch, FiFilter } from 'react-icons/fi';
import { targetService } from '../services/targetService';
import { telemetryService } from '../services/telemetryService';
import { executionService } from '../services/executionService';
import { auditService } from '../services/auditService';

export default function TargetManager() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [actionId, setActionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const data = await targetService.getAll();
      setTargets(data);
    } catch (err) {
      console.error('Failed to load targets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    setIsAdding(true);
    try {
      await targetService.create({ url: newUrl });
      await auditService.log(`Target registered: ${newUrl}`, 'ADMIN', 'TARGET_MANAGER');
      setNewUrl('');
      await loadTargets();
    } catch (err) {
      console.error('Add failed', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (id, url) => {
    setActionId(id);
    try {
      const newStatus = await targetService.toggleStatus(id);
      await auditService.log(`Target ${url} set to ${newStatus}`, 'ADMIN', 'TARGET_MANAGER');
      await loadTargets();
    } catch (err) {
      console.error('Toggle failed', err);
    } finally {
      setActionId(null);
    }
  };

  const filteredTargets = targets.filter(t => {
    const matchesSearch = t.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Target Orchestration</h2>
          <p className="text-sm text-gray-400">Manage high-scale extraction nodes across the edge network.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <input 
            type="text" 
            placeholder="Search by domain or endpoint..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-all"
          />
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="flex space-x-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400 outline-none focus:border-indigo-500 w-full"
          >
            <option value="ALL">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="IDLE">Idle</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleAddTarget} className="glass-panel p-4 flex gap-4 bg-indigo-500/5 border-indigo-500/10">
        <input 
          type="url" 
          placeholder="New Extraction Endpoint (https://...)" 
          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none" 
          value={newUrl} 
          onChange={(e) => setNewUrl(e.target.value)} 
          required 
        />
        <button disabled={isAdding} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all">
          {isAdding ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiPlus} />}
          <span>Provision</span>
        </button>
      </form>

      <div className="grid gap-4">
        {filteredTargets.map(target => (
          <div key={target.id} className="glass-panel p-5 flex items-center justify-between group">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`w-2 h-2 rounded-full ${target.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                <h3 className="font-mono text-sm text-indigo-400">{target.url}</h3>
              </div>
              <div className="flex items-center space-x-6 text-[11px] text-gray-500 uppercase tracking-widest font-bold">
                <span className="text-gray-400">Records: <strong className="text-indigo-400">{target.records}</strong></span>
                <span>Last Activity: {target.lastRun}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleToggle(target.id, target.url)}
                className={`p-2 rounded-lg border transition-all ${target.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}
              >
                <SafeIcon icon={target.status === 'RUNNING' ? FiPause : FiPlay} className="w-4 h-4" />
              </button>
              <button className="p-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg hover:text-rose-400 hover:border-rose-900/50">
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}