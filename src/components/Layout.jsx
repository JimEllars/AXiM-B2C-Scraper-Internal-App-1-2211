import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import TargetManager from './TargetManager';
import TelemetryStream from './TelemetryStream';
import Settings from './Settings';
import BatchHistory from './BatchHistory';
import SchemaViewer from './SchemaViewer';
import AuditLog from './AuditLog';
import ProxyManager from './ProxyManager';
import NotificationTray from './NotificationTray';
import QueueManager from './QueueManager';
import DataExplorer from './DataExplorer';

export default function Layout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  const addNotification = (title, message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => removeNotification(id), 6000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'targets': return <TargetManager />;
      case 'queue': return <QueueManager />;
      case 'explorer': return <DataExplorer />;
      case 'proxies': return <ProxyManager />;
      case 'history': return <BatchHistory />;
      case 'schema': return <SchemaViewer />;
      case 'telemetry': return <TelemetryStream />;
      case 'audit': return <AuditLog />;
      case 'settings': return <Settings />;
      default: return <div className="flex items-center justify-center h-full text-gray-500">Module Configuration Pending...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-6xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
      <NotificationTray notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
}