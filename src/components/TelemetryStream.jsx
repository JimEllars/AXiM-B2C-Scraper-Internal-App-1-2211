import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiLoader, FiPause, FiPlay, FiTrash2, FiLock, FiUnlock } from 'react-icons/fi';
import { format } from 'date-fns';
import { telemetryService } from '../services/telemetryService';

export default function TelemetryStream() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionState, setConnectionState] = useState('CONNECTING');

  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');

  const subscriptionRef = useRef(null);
  const endOfStreamRef = useRef(null);

  useEffect(() => {
    loadLogs();
    
    if (!isPaused) {
      subscriptionRef.current = telemetryService.subscribe((newLog) => {
        setLogs((prevLogs) => {
          // Prevent duplicates by ID just in case
          if (prevLogs.some(l => l.id === newLog.id)) return prevLogs;
          const updatedLogs = [...prevLogs, newLog];
          return updatedLogs.sort((a, b) => new Date(a.timestamp || a.time || a.created_at) - new Date(b.timestamp || b.time || b.created_at)).slice(-500);
        });
      }, (state) => {
          setConnectionState(state);
      });
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current(); // Unsubscribe
      }
    };
  }, [isPaused]);

  useEffect(() => {
    if (autoScroll && endOfStreamRef.current) {
      setTimeout(() => {
          endOfStreamRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [logs, autoScroll]);

  const loadLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await telemetryService.getAll();
      const sortedAndCapped = data.sort((a, b) => new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time)).slice(-500);
      setLogs(sortedAndCapped);
    } catch (err) {
      console.error('Failed to load telemetry', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const clearLogs = () => {
      setLogs([]);
  };

  const getIcon = (type) => {
    const t = type ? type.toUpperCase() : '';
    if (t === 'ERROR' || t === 'HIGH') return <SafeIcon icon={FiAlertCircle} className="text-rose-400" />;
    if (t === 'SUCCESS') return <SafeIcon icon={FiCheckCircle} className="text-emerald-400" />;
    return <SafeIcon icon={FiInfo} className="text-slate-400" />;
  };


  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'ALL' ||
      (filterLevel === 'ERROR' && (log.level?.toUpperCase() === 'ERROR' || log.level?.toUpperCase() === 'HIGH' || log.type?.toUpperCase() === 'ERROR' || log.type?.toUpperCase() === 'HIGH')) ||
      (filterLevel === 'WARN' && (log.level?.toUpperCase() === 'WARN' || log.type?.toUpperCase() === 'WARN')) ||
      (filterLevel === 'INFO' && (log.level?.toUpperCase() === 'INFO' || log.type?.toUpperCase() === 'INFO' || log.level?.toUpperCase() === 'LOW' || log.type?.toUpperCase() === 'LOW'));

    const sourceMatch = filterSource === 'ALL' || (log.module || log.origin) === filterSource;

    return levelMatch && sourceMatch;
  });

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
          <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white">Live Telemetry Feed</h2>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                  connectionState === 'LIVE EDGE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : connectionState === 'LOCAL DEMO'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                  {connectionState}
              </span>
          </div>
          <p className="text-sm text-gray-400">Real-time ingestion stream from Onyx Mk3 edge nodes.</p>
        </div>
        <div className="flex items-center space-x-2">

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">Info / Low</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error / High</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Sources</option>
            {[...new Set(logs.map(l => l.module || l.origin).filter(Boolean))].map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
           <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              autoScroll
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            <SafeIcon icon={autoScroll ? FiLock : FiUnlock} />
            <span className="hidden sm:inline">{autoScroll ? 'Auto-Scroll On' : 'Auto-Scroll Off'}</span>
          </button>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              isPaused 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            <SafeIcon icon={isPaused ? FiPlay : FiPause} />
            <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 bg-gray-900 text-gray-400 border border-gray-800 rounded-lg hover:text-rose-400 hover:border-rose-500/30 transition-colors"
            title="Clear Logs"
          >
             <SafeIcon icon={FiTrash2} />
          </button>

          <button 
            onClick={() => loadLogs()} 
            className="px-3 py-1.5 bg-gray-900 text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors hidden sm:block"
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
            {filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-gray-600 text-sm">No telemetry packets captured.</div>
            ) : (
              filteredLogs.map((log) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id}
                  className={`grid grid-cols-12 gap-4 p-3 rounded-lg border text-[11px] items-center transition-all ${
                    (log.level && (log.level.toUpperCase() === 'ERROR' || log.level.toUpperCase() === 'HIGH')) || (log.type && (log.type.toUpperCase() === 'ERROR' || log.type.toUpperCase() === 'HIGH'))
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : (log.level && log.level.toUpperCase() === 'SUCCESS') || (log.type && log.type.toUpperCase() === 'SUCCESS')
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300' 
                        : 'bg-gray-900/40 border-gray-800 text-slate-400'
                  }`}
                >
                  <div className="col-span-2 opacity-60">
                    {format(new Date(log.timestamp || log.time || log.created_at || Date.now()), 'HH:mm:ss.SSS')}
                  </div>
                  <div className="col-span-2 flex flex-col space-y-1">
                    <span className="px-2 py-0.5 rounded bg-gray-950 border border-gray-800 text-[9px] font-bold text-indigo-400 uppercase self-start truncate max-w-full">
                      {log.module || log.origin}
                    </span>
                    {log.traceId && (
                      <span className="text-[8px] text-gray-600 truncate max-w-full" title={log.traceId}>
                        {log.traceId.split('-')[0]}...
                      </span>
                    )}
                  </div>
                  <div className="col-span-8 flex items-center space-x-3">
                    {((log.level && (log.level.toUpperCase() === 'ERROR' || log.level.toUpperCase() === 'HIGH')) || (log.type && (log.type.toUpperCase() === 'ERROR' || log.type.toUpperCase() === 'HIGH'))) && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] font-bold text-rose-400 uppercase">HIGH SEV</span>
                    )}
                    {getIcon(log.level || log.type)}
                    <span className="truncate">{log.message}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={endOfStreamRef} />
        </div>
      </div>
    </div>
  );
}
