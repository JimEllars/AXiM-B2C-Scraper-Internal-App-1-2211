import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import StatCard from './StatCard';
import HealthMonitor from './HealthMonitor';
import NetworkMap from './NetworkMap';
import { FiUsers, FiDatabase, FiAlertTriangle, FiZap, FiLoader, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { targetService } from '../services/targetService';
import { batchService } from '../services/batchService';
import { telemetryService } from '../services/telemetryService';
import { executionService } from '../services/executionService';
import { format, subDays, startOfDay, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ dates: [], values: [] });
  const [stats, setStats] = useState({
    totalRecords: 0,
    activeLedgers: 0,
    evasionRate: '98.8%',
    wafBlocks: 0
  });

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const [targets, batches, logs] = await Promise.all([
        targetService.getAll(),
        batchService.getAll(),
        telemetryService.getAll()
      ]);

      const totalRecords = batches.reduce((acc, curr) => acc + (curr.records || 0), 0);
      const wafBlocks = logs.filter(log => 
        log.type === 'error' && log.message.toLowerCase().includes('waf')
      ).length;

      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
      const chartValues = last7Days.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        return batches
          .filter(b => isWithinInterval(new Date(b.time), { start: dayStart, end: dayEnd }))
          .reduce((sum, b) => sum + b.records, 0);
      });

      setChartData({
        dates: last7Days.map(d => format(d, 'MMM dd')),
        values: chartValues
      });

      setStats({
        totalRecords: totalRecords.toLocaleString(),
        activeLedgers: targets.length,
        evasionRate: '98.8%',
        wafBlocks: wafBlocks
      });
    } catch (err) {
      console.error('Dashboard Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#1e293b', textStyle: { color: '#94a3b8' } },
    xAxis: { type: 'category', data: chartData.dates, axisLine: { lineStyle: { color: '#334155' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.2)' } } },
    series: [{
      data: chartData.values,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#6366f1', width: 2 },
      areaStyle: { color: 'rgba(99, 102, 241, 0.1)' }
    }]
  };

  const statusOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#0f172a', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: 1048, name: 'Success', itemStyle: { color: '#10b981' } },
        { value: 735, name: 'WAF Block', itemStyle: { color: '#f43f5e' } },
        { value: 580, name: 'Timeout', itemStyle: { color: '#f59e0b' } },
        { value: 484, name: 'Retrying', itemStyle: { color: '#6366f1' } }
      ]
    }]
  };

  if (loading) return <div className="flex justify-center h-full items-center"><SafeIcon icon={FiLoader} className="w-10 h-10 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 text-glow">System Intelligence</h2>
          <p className="text-sm text-gray-400 font-mono uppercase tracking-tighter">Node ID: ONYX_MK3_EDGE_01</p>
        </div>
        <button onClick={() => setIsTriggering(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all">
          <SafeIcon icon={FiZap} className={isTriggering ? 'animate-pulse' : ''} />
          <span>Manual Orchestration</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Records" value={stats.totalRecords} icon={FiUsers} trend="+12% growth" positive={true} />
        <StatCard title="Active Targets" value={stats.activeLedgers} icon={FiDatabase} />
        <StatCard title="Evasion Health" value={stats.evasionRate} icon={FiZap} trend="Optimal" positive={true} />
        <StatCard title="Blocked Requests" value={stats.wafBlocks} icon={FiAlertTriangle} trend="Auto-rotating" positive={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center space-x-2 mb-6">
              <SafeIcon icon={FiTrendingUp} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Extraction Momentum</h3>
            </div>
            <div className="h-[250px]">
              <ReactECharts option={trendOption} style={{ height: '100%' }} />
            </div>
          </div>
          <NetworkMap />
        </div>
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center space-x-2 mb-6">
              <SafeIcon icon={FiPieChart} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Job Distribution</h3>
            </div>
            <div className="h-[200px]">
              <ReactECharts option={statusOption} style={{ height: '100%' }} />
            </div>
          </div>
          <HealthMonitor />
        </div>
      </div>
    </div>
  );
}