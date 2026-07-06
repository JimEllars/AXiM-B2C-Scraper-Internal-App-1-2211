import { telemetryService } from './telemetryService';
import { batchService } from './batchService';
import { queueService } from './queueService';
import { targetService } from './targetService';

export const executionService = {
  async triggerManualOrchestration(dryRun = false) {
    await telemetryService.log('info', 'Manual B2C Orchestration sequence initiated', 'CONTROL_PLANE');
    
    try {
      // 1. Get all active targets
      const targets = await targetService.getAll();
      const activeTargets = targets.filter(t => t.status === 'RUNNING');
      
      if (activeTargets.length === 0) {
        throw new Error('No active targets provisioned for orchestration.');
      }

      // 2. Pick a random target to "process"
      const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
      
      // 3. Make the actual call to the worker
      const workerUrl = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787') + '/api/trigger';
      const token = import.meta.env.VITE_DASHBOARD_ACCESS_TOKEN;

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source: 'MANUAL_UI',
          targetUrl: target.url,
          priority: 'HIGH',
          dry_run: dryRun
        })
      });

      if (!response.ok) {
        let errMsg = `Worker responded with HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch(e) { /* ignore parse error */ }
        throw new Error(errMsg);
      }

      const result = await response.json();

      await queueService.enqueue(target.url, 'HIGH');
      await telemetryService.log('success', `Orchestrated high-priority extraction for: ${target.url}`, 'SCHEDULER');

      // 4. Log batch result using real worker response data if available
      const records = result.recordsProcessed || 0;
      await batchService.log({
        target: target.url,
        records,
        status: records > 0 ? 'COMPLETED' : 'FAILED',
        bridge_id: result.runId || ''
      });

      return { success: true, target: target.url, records, workerJobId: result.job_id };
    } catch (err) {
      await telemetryService.log('error', `Orchestration failed: ${err.message}`, 'CONTROL_PLANE');
      throw err;
    }
  }
};