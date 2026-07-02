import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiLoader, FiPause, FiPlay } from 'react-icons/fi';
import { format } from 'date-fns';
import { telemetryService } from '../services/telemetryService';

export default function TelemetryStream() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const pollInterval = useRef(null);

  useEffect(() => {
    loadLogs();
    
    // Auto-refresh every 10 seconds unless paused
    pollInterval.current = setInterval(() => {
      if (!isPaused) loadLogs(false);
    }, 10000);

    return () => clearInterval(pollInterval.current);
  }, [isPaused]);

  const loadLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await telemetryService.getAll();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load telemetry', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getIcon = (type) => {
    const t = type ? type.toUpperCase() : '';
    if (t === 'ERROR' || t === 'HIGH') return <SafeIcon icon={FiAlertCircle} className="text-rose-400" />;
    if (t === 'SUCCESS') return <SafeIcon icon={FiCheckCircle} className="text-emerald-400" />;
    return <SafeIcon icon={FiInfo} className="text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Live Telemetry Feed</h2>
          <p className="text-sm text-gray-400">Real-time ingestion stream from Onyx Mk3 edge nodes.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              isPaused 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            <SafeIcon icon={isPaused ? FiPlay : FiPause} />
            <span>{isPaused ? 'Resume Sync' : 'Pause Sync'}</span>
          </button>
          <button 
            onClick={() => loadLogs()} 
            className="px-3 py-1.5 bg-gray-900 text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900/40">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Origin</div>
          <div className="col-span-8">Payload Message / Handshake</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {logs.length === 0 ? (
              <div className="text-center py-20 text-gray-600 text-sm">No telemetry packets captured.</div>
            ) : (
              logs.map((log) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id}
                  className={`grid grid-cols-12 gap-4 p-3 rounded-lg border text-[11px] items-center transition-all ${
                    (log.type && (log.type.toUpperCase() === 'ERROR' || log.type.toUpperCase() === 'HIGH'))
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : (log.type && log.type.toUpperCase() === 'SUCCESS')
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300' 
                        : 'bg-gray-900/40 border-gray-800 text-slate-400'
                  }`}
                >
                  <div className="col-span-2 opacity-60">
                    {format(new Date(log.time), 'HH:mm:ss.SSS')}
                  </div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded bg-gray-950 border border-gray-800 text-[9px] font-bold text-indigo-400 uppercase">
                      {log.origin}
                    </span>
                  </div>
                  <div className="col-span-8 flex items-center space-x-3">
                    {(log.type && (log.type.toUpperCase() === 'ERROR' || log.type.toUpperCase() === 'HIGH')) && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] font-bold text-rose-400 uppercase">HIGH SEV</span>
                    )}
                    {getIcon(log.type)}
                    <span className="truncate">{log.message}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}