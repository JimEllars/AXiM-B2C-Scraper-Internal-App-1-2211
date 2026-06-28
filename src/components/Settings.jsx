import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiSave, FiLock, FiGlobe, FiCpu, FiRefreshCw, FiLoader, FiCheck, FiKey, FiLink } from 'react-icons/fi';
import { settingsService } from '../services/settingsService';
import { telemetryService } from '../services/telemetryService';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    enrichmentUrl: "https://api.axim.us.com/v1/webhooks/enrich",
    telemetryUrl: "https://api.axim.us.com/v1/telemetry/collect",
    batchSize: "100",
    jitterRange: "1000ms - 15000ms",
    workerSchedule: "0 */4 * * *",
    proxyProvider: "ScraperAPI (Residential)",
    nodeWebhookKey: "axim_onyx_" + Math.random().toString(36).substr(2, 16)
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getAll();
      if (Object.keys(data).length > 0) {
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateBatch(config);
      await telemetryService.log('info', 'Ecosystem configuration updated by administrator', 'ADMIN_UI');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ecosystem Config</h2>
          <p className="text-sm text-gray-400">Multi-source orchestration and node-level parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <SafeIcon icon={FiGlobe} className="w-4 h-4" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Network Egress</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Enrichment Bridge Endpoint</label>
              <input 
                type="text" 
                value={config.enrichmentUrl} 
                onChange={(e) => setConfig({...config, enrichmentUrl: e.target.value})} 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-colors font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Telemetry Gateway</label>
              <input 
                type="text" 
                value={config.telemetryUrl} 
                onChange={(e) => setConfig({...config, telemetryUrl: e.target.value})} 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-colors font-mono" 
              />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <SafeIcon icon={FiCpu} className="w-4 h-4" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Edge Worker Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Batch Size</label>
              <input 
                type="text" 
                value={config.batchSize} 
                onChange={(e) => setConfig({...config, batchSize: e.target.value})} 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-colors font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Worker Schedule</label>
              <input 
                type="text" 
                value={config.workerSchedule} 
                onChange={(e) => setConfig({...config, workerSchedule: e.target.value})} 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-colors font-mono" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Anti-Bot Jitter Delay</label>
            <input 
              type="text" 
              value={config.jitterRange} 
              onChange={(e) => setConfig({...config, jitterRange: e.target.value})} 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:border-indigo-500 outline-none transition-colors font-mono" 
            />
          </div>
        </div>

        {/* API GATEWAY SECTION */}
        <div className="glass-panel p-6 col-span-1 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center space-x-2 text-emerald-400">
              <SafeIcon icon={FiLink} className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Ecosystem API Gateway</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase font-bold">Node Listening</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Webhook Access Token</label>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly 
                  value={config.nodeWebhookKey || ''} 
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-10 py-3 text-xs text-indigo-300 font-mono outline-none" 
                />
                <SafeIcon icon={FiKey} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
              </div>
              <p className="mt-2 text-[10px] text-gray-500">Provide this token to other AXiM apps to trigger this node via REST.</p>
            </div>
            
            <div className="p-4 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
              <h4 className="text-xs font-bold text-indigo-300 mb-2 uppercase">Trigger Sample (cURL)</h4>
              <pre className="text-[10px] font-mono text-gray-400 leading-relaxed whitespace-pre-wrap">
{`curl -X POST "https://worker.axim.edge/api/trigger" \\
-H "Authorization: Bearer ${(config.nodeWebhookKey || '').substring(0,6)}..." \\
-d '{"url":"https://target.com","source":"EXTERNAL_CRM"}'`}
              </pre>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-rose-400">
              <SafeIcon icon={FiLock} className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Security Vault (Wrangler Secrets)</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">PROXY_PROVIDER_KEY</p>
              <p className="text-sm font-mono text-gray-300 truncate">••••••••••••••••••••••••</p>
            </div>
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">AXIM_INTERNAL_KEY</p>
              <p className="text-sm font-mono text-gray-300 truncate">••••••••••••••••••••••••</p>
            </div>
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">DASHBOARD_ACCESS_TOKEN</p>
              <p className="text-sm font-mono text-gray-300 truncate">••••••••••••••••••••••••</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button 
          onClick={loadSettings} 
          className="flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors" 
        > 
          <SafeIcon icon={FiRefreshCw} /> 
          <span>Reload</span> 
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className={`flex items-center space-x-2 px-8 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`} 
        > 
          {saving ? <SafeIcon icon={FiLoader} className="animate-spin" /> : saved ? <SafeIcon icon={FiCheck} /> : <SafeIcon icon={FiSave} />} 
          <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span> 
        </button>
      </div>
    </div>
  );
}