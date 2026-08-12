#!/bin/bash
cat << 'INNER_EOF' > src/components/DataExplorer.jsx
import React, { useState, useEffect } from 'react';
import { FiDatabase, FiSearch, FiCode, FiDownload, FiLoader, FiX, FiFileText } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { dataService } from '../services/dataService';
import { auditService } from '../services/auditService';
import { format } from 'date-fns';

export default function DataExplorer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    loadData(true);
    const intervalId = setInterval(() => loadData(false), 30000); // Background poll
    return () => clearInterval(intervalId);
  }, []);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const records = await dataService.getAll();
      setData(records);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleExportJSON = async (item) => {
    const dataStr = JSON.stringify(item.payload || item, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `egress_${item.id ? item.id.substring(0,8) : 'data'}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    if (item.id) {
        await auditService.log(`Exported JSON payload ${item.id}`, 'ADMIN', 'DATA_EXPLORER');
    }
  };

  const handleExportBatchCSV = async () => {
     if (filtered.length === 0) return;

     const headers = ['id', 'source', 'time', 'first_name', 'last_name', 'email', 'phone', 'address', 'origin_url'];
     let csvContent = headers.join(',') + '\n';

     filtered.forEach(item => {
         const payload = item.payload || {};
         const row = [
             item.id || '',
             item.source || '',
             item.time || '',
             payload.first_name || '',
             payload.last_name || '',
             payload.email || '',
             payload.phone || '',
             payload.address || '',
             payload.origin_url || ''
         ];
         csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
     });

     const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
     const linkElement = document.createElement('a');
     linkElement.setAttribute('href', dataUri);
     linkElement.setAttribute('download', 'egress_batch.csv');
     document.body.appendChild(linkElement);
     linkElement.click();
     document.body.removeChild(linkElement);

     await auditService.log(`Exported Batch CSV of ${filtered.length} items`, 'ADMIN', 'DATA_EXPLORER');
  };

  const handleExportBatchJSON = async () => {
    if (filtered.length === 0) return;
    const dataStr = JSON.stringify(filtered, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'egress_batch.json');
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    await auditService.log(`Exported Batch JSON of ${filtered.length} items`, 'ADMIN', 'DATA_EXPLORER');
  };


  const filtered = data.filter(d => {
    const s = searchTerm.toLowerCase();
    const payload = d.payload || {};
    return (d.source && d.source.toLowerCase().includes(s)) ||
           (payload.first_name && payload.first_name.toLowerCase().includes(s)) ||
           (payload.last_name && payload.last_name.toLowerCase().includes(s)) ||
           (payload.email && payload.email.toLowerCase().includes(s)) ||
           (payload.phone && payload.phone.toLowerCase().includes(s)) ||
           JSON.stringify(payload).toLowerCase().includes(s);
  });

  if (loading) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Egress Inspector</h2>
          <p className="text-sm text-gray-400">Verifying raw extracted payloads before downstream enrichment.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-300 focus:border-indigo-500 outline-none w-64"
            />
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
          </div>
          <button
             onClick={handleExportBatchCSV}
             className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
             Export CSV
          </button>
          <button
             onClick={handleExportBatchJSON}
             className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
             Export JSON
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((item, idx) => (
          <div key={item.id || idx} className="glass-panel p-4 bg-gray-950/40">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiCode} className="text-indigo-400" />
                <span className="text-[10px] font-mono text-gray-500">{item.source || 'UNKNOWN_SOURCE'}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">{item.time ? format(new Date(item.time), 'MMM dd, HH:mm:ss') : 'Unknown Time'}</span>
            </div>

            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-gray-400">
                  <span className="font-bold text-gray-300">{(item.payload?.first_name || '') + ' ' + (item.payload?.last_name || '')}</span>
                  {item.payload?.email && <span className="ml-3 text-gray-500">{item.payload.email}</span>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewItem(item)}
                  className="text-[9px] font-bold text-gray-500 hover:text-indigo-400 uppercase tracking-widest flex items-center space-x-1 px-3 py-1.5 rounded bg-gray-900 border border-gray-800 hover:border-indigo-500/50 transition-all"
                >
                  <SafeIcon icon={FiFileText} />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleExportJSON(item)}
                  className="text-[9px] font-bold text-gray-500 hover:text-indigo-400 uppercase tracking-widest flex items-center space-x-1 px-3 py-1.5 rounded bg-gray-900 border border-gray-800 hover:border-indigo-500/50 transition-all"
                >
                  <SafeIcon icon={FiDownload} />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
            No egress payloads match your search criteria.
          </div>
        )}
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl bg-gray-950 border-gray-800 relative">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <SafeIcon icon={FiX} className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">Record Preview</h3>
              <p className="text-xs text-gray-500 font-mono mb-6">ID: {previewItem.id}</p>

              <div className="bg-black/50 p-4 rounded-lg border border-gray-800 overflow-auto max-h-[60vh]">
                <pre className="text-xs font-mono text-indigo-300/90 whitespace-pre-wrap">
                  {JSON.stringify(previewItem.payload || previewItem, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF
