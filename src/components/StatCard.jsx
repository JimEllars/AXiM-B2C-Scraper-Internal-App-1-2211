import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';

export default function StatCard({ title, value, icon, trend, positive }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-panel p-6 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30"
    >
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <motion.h3
          key={value}
          initial={{ opacity: 0.5, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight text-white"
        >
          {value}
        </motion.h3>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl shadow-inner ${positive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'}`}>
        <SafeIcon icon={icon} className="w-6 h-6" />
      </div>
    </motion.div>
  );
}