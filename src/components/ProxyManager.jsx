import React, { useState, useEffect } from 'react';
import SafeIcon from '../common/SafeIcon';
import { FiServer, FiActivity, FiShield, FiRefreshCw, FiLoader, FiZap } from 'react-icons/fi';
import { proxyService } from '../services/proxyService';

export default function ProxyManager() {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProxies();
  }, []);

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
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
                <SafeIcon icon={FiServer} className="text-indigo-400 w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${
                proxy.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-900/20'
              }`}>
                {proxy.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">{proxy.provider}</h3>
            <p className="text-[10px] text-gray-500 font-mono mb-4">{proxy.region}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Latency</span>
                <span className="font-mono text-gray-300">{proxy.latency}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Success Rate</span>
                <span className="font-mono text-emerald-400">{proxy.successRate}</span>
              </div>
              
              <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden mt-4">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-1000" 
                  style={{ width: proxy.successRate }} 
                />
              </div>
            </div>

            <button className="w-full mt-6 py-2 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white hover:border-gray-700 transition-all">
              Test Handshake
            </button>
          </div>
        ))}

        <button className="glass-panel p-6 border-dashed border-gray-700 flex flex-col items-center justify-center space-y-3 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-gray-500 hover:text-indigo-400 group">
          <div className="p-3 rounded-full bg-gray-900 border border-gray-800 group-hover:border-indigo-500/30">
            <SafeIcon icon={FiZap} className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Connect New Provider</span>
        </button>
      </div>
    </div>
  );
}