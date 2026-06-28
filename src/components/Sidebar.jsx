import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiActivity, FiServer, FiSettings, FiDatabase, FiShield, FiList, FiCode, FiFileText, FiZap, FiLayers, FiSearch, FiUserPlus } from 'react-icons/fi';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: FiActivity },
    { id: 'targets', label: 'B2C Targets', icon: FiServer },
    { id: 'enrichment', label: 'Enrichment Hub', icon: FiUserPlus },
    { id: 'queue', label: 'Active Queue', icon: FiLayers },
    { id: 'explorer', label: 'Data Egress', icon: FiSearch },
    { id: 'proxies', label: 'Proxy Swarm', icon: FiZap },
    { id: 'history', label: 'Batch Ledger', icon: FiList },
    { id: 'telemetry', label: 'Node Health', icon: FiShield },
    { id: 'settings', label: 'System Config', icon: FiSettings },
  ];

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-950/50 flex flex-col h-full">
      <div className="p-6 pb-2">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <SafeIcon icon={FiDatabase} className="text-white w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white uppercase">AXiM Onyx</h1>
            <p className="text-[10px] text-gray-400 font-mono">B2C SCAPER MK3</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
              activeTab === item.id 
                ? 'bg-indigo-500/10 text-white border border-indigo-500/20' 
                : 'text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'
            }`}
          >
            <SafeIcon icon={item.icon} className={`w-4 h-4 ${activeTab === item.id ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`} />
            <span>{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="activeIndicator" className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-3 px-4 py-3 bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-gray-300 uppercase tracking-tighter truncate">EDGE_ONYX_NODE_01</span>
        </div>
      </div>
    </div>
  );
}