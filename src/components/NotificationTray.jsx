import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { FiX, FiBell, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

export default function NotificationTray({ notifications, removeNotification }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 w-80">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`glass-panel p-4 flex items-start space-x-3 border-l-4 shadow-2xl ${
              n.type === 'error' ? 'border-l-rose-500' : n.type === 'success' ? 'border-l-emerald-500' : 'border-l-indigo-500'
            }`}
          >
            <div className={`mt-0.5 ${n.type === 'error' ? 'text-rose-400' : n.type === 'success' ? 'text-emerald-400' : 'text-indigo-400'}`}>
              <SafeIcon icon={n.type === 'error' ? FiAlertCircle : n.type === 'success' ? FiCheckCircle : FiInfo} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{n.title}</h4>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <SafeIcon icon={FiX} className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}