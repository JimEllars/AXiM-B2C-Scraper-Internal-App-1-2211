import { telemetryService } from './telemetryService';

export const auditService = {
  async getAll() {
    const telemetryLogs = await telemetryService.getAll();

    // Filter admin/system events for audit log
    const auditLogs = telemetryLogs.filter(log =>
        log.level === 'warn' ||
        log.level === 'error' ||
        log.module === 'CONTROL_PLANE' ||
        log.module === 'ADMIN' ||
        log.message.includes('Purged') ||
        log.message.includes('Re-queued')
    ).map(log => ({
        id: log.id || crypto.randomUUID(),
        action: log.message,
        actor: log.module === 'ADMIN' ? 'ADMIN' : 'SYSTEM',
        component: log.module,
        status: log.level === 'error' ? 'FAILED' : 'SUCCESS',
        time: log.timestamp || log.time || log.created_at || new Date().toISOString()
    }));

    if (auditLogs.length === 0) {
        return [
           { id: 'a-1', action: 'System Initialization', actor: 'SYSTEM', component: 'CORE', status: 'SUCCESS', time: new Date().toISOString() }
        ];
    }

    return auditLogs;
  },

  async log(action, actor = 'SYSTEM_ADMIN', component = 'CORE', status = 'SUCCESS') {
     await telemetryService.log(status === 'SUCCESS' ? 'info' : 'error', action, actor === 'SYSTEM_ADMIN' ? 'ADMIN' : component);
  }
};
