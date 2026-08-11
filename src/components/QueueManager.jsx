import React, { useState, useEffect } from 'react';
import { FiLayers, FiRefreshCw, FiLoader, FiAlertCircle, FiCheckCircle, FiClock, FiPlayCircle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { queueService } from '../services/queueService';
import { auditService } from '../services/auditService';
import { format } from 'date-fns';

export default function QueueManager() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadJobs();
    const intervalId = setInterval(() => loadJobs(true), 15000);
    return () => clearInterval(intervalId);
  }, []);

  const loadJobs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await queueService.getAll();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);

    const completed = jobs.filter(j => j.status === 'COMPLETED').length;
    if (completed === 0) {
        if (window.addNotification) window.addNotification('Queue Clear', 'No completed jobs to purge', 'info');
        setClearing(false);
        return;
    }
    await queueService.clearCompleted();
    await auditService.log(`Purged ${completed} completed queue records`, 'ADMIN', 'QUEUE_MANAGER');
    await loadJobs(true);
    if (window.addNotification) { window.addNotification('Queue Purged', `Cleared ${completed} completed jobs`, 'success'); }
    setClearing(false);
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const failedJobs = jobs.filter(j => j.status === 'FAILED');
      for (const job of failedJobs) {
        await queueService.updateStatus(job.id, 'PENDING', '');
      }
      if (failedJobs.length > 0) {
        await auditService.log(`Re-queued ${failedJobs.length} failed jobs`, 'ADMIN', 'QUEUE_MANAGER');
      }
      await loadJobs(true);
      if (window.addNotification) { window.addNotification('Jobs Re-queued', `Re-queued ${failedJobs.length} failed jobs`, 'success'); }
    } catch (err) {
      console.error('Retry failed', err);
      if (window.addNotification) { window.addNotification('Retry Failed', `Error retrying jobs`, 'error'); }
    } finally {
      setRetrying(false);
    }
  };

  const failedCount = jobs.filter(j => j.status === 'FAILED').length;

  if (loading && !retrying) return <div className="flex justify-center py-20"><SafeIcon icon={FiLoader} className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Job Queue</h2>
          <p className="text-sm text-gray-400">Real-time status of extraction tasks in the edge pipeline.</p>
        </div>
        <div className="flex space-x-3">
          {failedCount > 0 && (
            <button 
              onClick={handleRetryFailed} 
              disabled={retrying}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              {retrying ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiPlayCircle} />}
              <span>Retry Failed ({failedCount})</span>
            </button>
          )}
          <button onClick={handleClear} disabled={clearing} className="flex items-center space-x-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all disabled:opacity-50">
            {clearing ? <SafeIcon icon={FiLoader} className="animate-spin" /> : null}
            <span>Purge Completed</span>
          </button>
          <button onClick={() => loadJobs(true)} disabled={refreshing || loading} className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
            <SafeIcon icon={FiRefreshCw} className={refreshing || loading || retrying ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Priority</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target URL</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Retries</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Queued At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    job.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {job.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300 truncate max-w-xs">{job.url}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={job.status === 'COMPLETED' ? FiCheckCircle : job.status === 'FAILED' ? FiAlertCircle : FiClock} 
                      className={job.status === 'COMPLETED' ? 'text-emerald-500' : job.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'} 
                    />
                    <span className={job.status === 'COMPLETED' ? 'text-emerald-400' : job.status === 'FAILED' ? 'text-rose-400' : 'text-amber-400'}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{job.attempts}/3</td>
                <td className="px-6 py-4 text-right text-gray-500">
                  {format(job.createdAt, 'HH:mm:ss')}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500 font-sans text-sm border-t border-gray-800">
                  The active job queue is currently empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}