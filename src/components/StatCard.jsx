import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';

export default function StatCard({ title, value, icon, trend, positive }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="glass-panel p-6 flex items-center justify-between"
    >
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
        <SafeIcon icon={icon} className="w-6 h-6" />
      </div>
    </motion.div>
  );
}