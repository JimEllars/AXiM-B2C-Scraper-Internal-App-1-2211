import { telemetryService } from './telemetryService';
import { batchService } from './batchService';
import { queueService } from './queueService';
import { targetService } from './targetService';

export const executionService = {
  async triggerManualOrchestration() {
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
      
      // 3. Enqueue a high-priority job
      await queueService.enqueue(target.url, 'HIGH');
      await telemetryService.log('success', `Orchestrated high-priority extraction for: ${target.url}`, 'SCHEDULER');

      // 4. Simulate immediate batch logging for UI feedback
      const records = Math.floor(Math.random() * 150) + 50;
      await batchService.log({
        target: target.url,
        records,
        status: 'COMPLETED',
        bridge_id: `b2c_${Math.random().toString(36).substr(2, 9)}`
      });

      return { success: true, target: target.url, records };
    } catch (err) {
      await telemetryService.log('error', `Orchestration failed: ${err.message}`, 'CONTROL_PLANE');
      throw err;
    }
  }
};