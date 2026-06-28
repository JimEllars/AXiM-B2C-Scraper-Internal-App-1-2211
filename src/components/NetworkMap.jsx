import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiGlobe, FiServer, FiArrowRight } from 'react-icons/fi';

export default function NetworkMap() {
  const nodes = [
    { id: 1, x: '20%', y: '30%', status: 'active', label: 'US-EAST' },
    { id: 2, x: '45%', y: '40%', status: 'active', label: 'EU-CENTRAL' },
    { id: 3, x: '75%', y: '60%', status: 'standby', label: 'ASIA-PAC' },
    { id: 4, x: '30%', y: '70%', status: 'active', label: 'LATAM' },
  ];

  return (
    <div className="glass-panel p-6 overflow-hidden relative min-h-[300px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiGlobe} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Global Edge Swarm</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
          NODE MESH: OPERATIONAL
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
            <div className={`w-3 h-3 rounded-full ${node.status === 'active' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-gray-600'} transition-all group-hover:scale-125`} />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-800 px-2 py-1 rounded text-[9px] font-mono text-indigo-400">
              {node.label}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Mesh Throughput</p>
          <p className="text-sm font-mono text-white">4.2 GB/hr</p>
        </div>
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Edge Latency (Avg)</p>
          <p className="text-sm font-mono text-emerald-400">128ms</p>
        </div>
      </div>
    </div>
  );
}