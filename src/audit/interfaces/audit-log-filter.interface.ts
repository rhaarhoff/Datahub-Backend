import { AuditAction } from './audit-action.enum';

export interface AuditLogFilter {
    action?: AuditAction;
    userId?: number;
    tenantId?: number;
    featureId?: number;
    startDate?: Date;
    endDate?: Date;
  }