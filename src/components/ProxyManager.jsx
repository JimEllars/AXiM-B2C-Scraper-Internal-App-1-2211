import React, { useState, useEffect } from 'react';
import SafeIcon from '../common/SafeIcon';
import { FiServer, FiActivity, FiShield, FiRefreshCw, FiLoader, FiZap, FiPlus, FiX } from 'react-icons/fi';
import { proxyService } from '../services/proxyService';
import { auditService } from '../services/auditService';

export default function ProxyManager() {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProxy, setNewProxy] = useState({ provider: '', region: 'GLOBAL' });
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadProxies(); }, []);

  const loadProxies = async () => {
    setLoading(true);
    try {
      const data = await proxyService.getAll();
      setProxies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProxy = async (e) => {
    e.preventDefault();
    if (!newProxy.provider) return;
    setAdding(true);
    try {
      await proxyService.create(newProxy);
      await auditService.log(`New proxy provider linked: ${newProxy.provider}`, 'ADMIN', 'PROXY_MANAGER');
      setNewProxy({ provider: '', region: 'GLOBAL' });
      setShowAddForm(false);
      await loadProxies();
    } catch (err) {
      console.error('Failed to add proxy', err);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Proxy Orchestration</h2>
          <p className="text-sm text-gray-400">Manage residential IP rotators and Anti-Bot health.</p>
        </div>
        <button 
          onClick={loadProxies}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold text-indigo-400 hover:border-indigo-500 transition-all"
        >
          <SafeIcon icon={FiRefreshCw} />
          <span>Sync Health</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {proxies.map((proxy) => (
          <div key={proxy.id} className="glass-panel p-6 relative group overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-colors ${
              proxy.status === 'TestingHandshake' ? 'bg-amber-500/5 group-hover:bg-amber-500/10' : 'bg-indigo-500/5 group-hover:bg-indigo-500/10'
            }`} />
            
            <div className="flex items-center justify-between mb-6 relative">
              <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
                <SafeIcon icon={FiServer} className={`${proxy.status === 'TestingHandshake' ? 'text-amber-400' : 'text-indigo-400'} w-5 h-5`} />
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${
                proxy.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                proxy.status === 'TestingHandshake' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                'bg-rose-500/10 text-rose-400 border-rose-900/20'
              }`}>
                {proxy.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1 relative">{proxy.provider}</h3>
            <p className="text-[10px] text-gray-500 font-mono mb-4">{proxy.region}</p>

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Latency</span>
                <span className="font-mono text-gray-300">{proxy.latency}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Success Rate</span>
                <span className={`font-mono ${proxy.status === 'TestingHandshake' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {proxy.successRate}
                </span>
              </div>
              
              <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden mt-4">
                <div 
                  className={`${proxy.status === 'TestingHandshake' ? 'bg-amber-500 w-1/4 animate-pulse' : 'bg-indigo-500'} h-full transition-all duration-1000`} 
                  style={{ width: proxy.status === 'TestingHandshake' ? undefined : proxy.successRate }} 
                />
              </div>
            </div>

            <button className="w-full mt-6 py-2 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white hover:border-gray-700 transition-all relative z-10">
              {proxy.status === 'TestingHandshake' ? 'Awaiting Handshake...' : 'Test Handshake'}
            </button>
          </div>
        ))}

        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="glass-panel p-6 border-dashed border-gray-700 flex flex-col items-center justify-center space-y-3 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-gray-500 hover:text-indigo-400 group min-h-[280px]"
          >
            <div className="p-3 rounded-full bg-gray-900 border border-gray-800 group-hover:border-indigo-500/30">
              <SafeIcon icon={FiPlus} className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Connect New Provider</span>
          </button>
        ) : (
          <form onSubmit={handleAddProxy} className="glass-panel p-6 border border-indigo-500/30 bg-indigo-500/5 relative min-h-[280px] flex flex-col">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <SafeIcon icon={FiX} />
            </button>
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">New Provider Link</h3>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Provider ID / Name</label>
                <input 
                  type="text" 
                  required
                  value={newProxy.provider}
                  onChange={e => setNewProxy({...newProxy, provider: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none"
                  placeholder="e.g. SmartProxy API"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Geographic Region</label>
                <select 
                  value={newProxy.region}
                  onChange={e => setNewProxy({...newProxy, region: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none"
                >
                  <option value="GLOBAL">Global (Mixed)</option>
                  <option value="US">North America (US)</option>
                  <option value="EU">Europe (EU)</option>
                  <option value="APAC">Asia-Pacific (APAC)</option>
                </select>
              </div>
            </div>

            <button 
              disabled={adding}
              type="submit" 
              className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex justify-center items-center space-x-2"
            >
              {adding ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiZap} />}
              <span>{adding ? 'Linking...' : 'Initialize Link'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}