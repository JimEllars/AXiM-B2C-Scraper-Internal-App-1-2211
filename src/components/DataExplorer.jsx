import React, { useState, useEffect } from 'react';
import { FiDatabase, FiSearch, FiCode, FiDownload, FiLoader } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { dataService } from '../services/dataService';
import { auditService } from '../services/auditService';
import { format } from 'date-fns';

export default function DataExplorer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const records = await dataService.getAll();
      setData(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (item) => {
    const dataStr = JSON.stringify(item.payload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `egress_${item.id.substring(0,8)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    await auditService.log(`Exported payload ${item.id}`, 'ADMIN', 'DATA_EXPLORER');
  };

  const filtered = data.filter(d => 
    d.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(d.payload).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Egress Inspector</h2>
          <p className="text-sm text-gray-400">Verifying raw extracted payloads before downstream enrichment.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search raw payloads..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-300 focus:border-indigo-500 outline-none w-64"
          />
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map(item => (
          <div key={item.id} className="glass-panel p-4 bg-gray-950/40">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiCode} className="text-indigo-400" />
                <span className="text-[10px] font-mono text-gray-500">{item.source}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">{format(item.time, 'MMM dd, HH:mm:ss')}</span>
            </div>
            <pre className="text-[11px] font-mono text-indigo-300/80 bg-black/40 p-3 rounded overflow-x-auto max-h-64">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => handleExport(item)}
                className="text-[9px] font-bold text-gray-500 hover:text-indigo-400 uppercase tracking-widest flex items-center space-x-1 px-3 py-1.5 rounded bg-gray-900 border border-gray-800 hover:border-indigo-500/50 transition-all"
              >
                <SafeIcon icon={FiDownload} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
            No egress payloads match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}