import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiGlobe, FiServer, FiArrowRight } from 'react-icons/fi';
import { telemetryService } from '../services/telemetryService';

export default function NetworkMap() {
  const [nodes, setNodes] = useState([
    { id: 1, x: '20%', y: '30%', status: 'standby', label: 'US-EAST', latency: 0 },
    { id: 2, x: '45%', y: '40%', status: 'standby', label: 'EU-CENTRAL', latency: 0 },
    { id: 3, x: '75%', y: '60%', status: 'standby', label: 'ASIA-PAC', latency: 0 },
    { id: 4, x: '30%', y: '70%', status: 'standby', label: 'LATAM', latency: 0 },
  ]);
  const [connectionMode, setConnectionMode] = useState('UNKNOWN');
  const [throughput, setThroughput] = useState(0);

  useEffect(() => {
    let unmounted = false;

    // Sub to telemetry
    const unsubscribe = telemetryService.subscribe((log) => {
      if (unmounted) return;

      // Update throughput based on log
      setThroughput(prev => prev + 1);

      // Randomly activate a node based on log activity for visual effect
      // In a real app we'd map log.module or log.region to a node
      setNodes(prev => {
        const next = [...prev];
        const activeIdx = Math.floor(Math.random() * next.length);
        next[activeIdx].status = 'active';
        next[activeIdx].latency = Math.floor(Math.random() * 50) + 10;

        // Deactivate others slightly
        next.forEach((n, idx) => {
          if (idx !== activeIdx && Math.random() > 0.8) {
            n.status = 'standby';
          }
        });
        return next;
      });
    }, (mode) => {
      if (unmounted) return;
      setConnectionMode(mode);
    });

    return () => {
      unmounted = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const avgLatency = nodes.reduce((acc, node) => acc + node.latency, 0) / nodes.length || 0;

  return (
    <div className="glass-panel p-6 overflow-hidden relative min-h-[300px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiGlobe} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Global Edge Swarm</h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${connectionMode === 'LIVE EDGE' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : connectionMode === 'LOCAL DEMO' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-gray-500 bg-gray-500/10 border-gray-500/20'}`}>
          NODE MESH: {connectionMode === 'LIVE EDGE' ? 'OPERATIONAL' : connectionMode === 'LOCAL DEMO' ? 'LOCAL SIM' : 'CONNECTING...'}
        </span>
      </div>

      <div className="relative w-full h-48 bg-gray-950/50 rounded-lg border border-gray-800 overflow-hidden">
        {/* Connection Lines (Static SVG) */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <line x1="20%" y1="30%" x2="45%" y2="40%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4" />
          <line x1="45%" y1="40%" x2="75%" y2="60%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4" />
          <line x1="20%" y1="30%" x2="30%" y2="70%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4" />
        </svg>

        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: node.x, top: node.y }}
          >
            <div className="relative">
              {node.status === 'active' && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-indigo-500/30"
                  animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {connectionMode === 'UNKNOWN' && (
                 <motion.div
                 className="absolute inset-0 rounded-full bg-amber-500/30"
                 animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                 transition={{ duration: 1.5, repeat: Infinity }}
               />
              )}
              <div className={`w-3 h-3 rounded-full relative z-10 ${node.status === 'active' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : connectionMode === 'UNKNOWN' ? 'bg-amber-500' : 'bg-gray-600'} transition-all group-hover:scale-125`} />
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-800 px-2 py-1 rounded flex flex-col items-center">
              <span className="text-[9px] font-mono text-indigo-400">{node.label}</span>
              <span className="text-[8px] text-gray-500">{node.latency > 0 ? `${node.latency}ms` : 'standby'}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Mesh Throughput</p>
          <p className="text-sm font-mono text-white">{(throughput * 0.05).toFixed(1)} GB/hr</p>
        </div>
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Edge Latency (Avg)</p>
          <p className="text-sm font-mono text-emerald-400">{avgLatency.toFixed(0)}ms</p>
        </div>
      </div>
    </div>
  );
}
