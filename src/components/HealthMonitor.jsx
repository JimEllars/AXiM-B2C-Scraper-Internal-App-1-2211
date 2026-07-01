import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiCheckCircle, FiActivity, FiArrowRight } from 'react-icons/fi';

export default function HealthMonitor() {
  const [workerHealth, setWorkerHealth] = useState({ status: 'Connecting...', latency: 'N/A', load: 'N/A' });
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = Date.now();
      try {
        const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
        const response = await fetch(`${workerUrl}/health`);
        const data = await response.json();
        const latency = Date.now() - startTime;

        setWorkerHealth({
          status: data.status === 'ONLINE' ? 'Healthy' : 'Degraded',
          latency: `${latency}ms`,
          load: data.load || 'Unknown'
        });
        setLastHeartbeat(new Date(data.timestamp || Date.now()).toLocaleTimeString());
      } catch (error) {
        setWorkerHealth({
          status: 'Offline',
          latency: 'N/A',
          load: '0%'
        });
        setLastHeartbeat(new Date().toLocaleTimeString());
      }
    };

    checkHealth();
    const intervalId = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const nodes = [
    { name: 'Edge Worker Node', status: workerHealth.status, latency: workerHealth.latency, load: workerHealth.load },
    { name: 'Cloudflare KV Ledger', status: 'Healthy', latency: '18ms', usage: '0.4GB' },
    { name: 'CRM Enrichment Bridge', status: 'Healthy', latency: '156ms', uptime: '99.9%' },
    { name: 'Onyx Mk3 Swarm', status: 'Standby', latency: 'N/A', mode: 'Autonomous' },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiActivity} className="text-indigo-400 w-4 h-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Macro-Ecosystem Health</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-500 font-mono uppercase">Last Heartbeat: {lastHeartbeat}</span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-800">
        {nodes.map((node, index) => (
          <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-gray-950 border border-gray-800 flex items-center justify-center">
                <SafeIcon icon={FiCheckCircle} className="text-emerald-500 w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">{node.name}</h4>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">{node.status}</span>
                  <span className="text-[10px] font-mono text-indigo-400">{node.latency}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs font-mono text-gray-400">
                {node.load || node.usage || node.uptime || node.mode}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-indigo-500/5 flex items-center justify-center">
        <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center space-x-2 hover:text-indigo-300 transition-colors">
          <span>View Macro-System Architecture</span>
          <SafeIcon icon={FiArrowRight} />
        </button>
      </div>
    </div>
  );
}