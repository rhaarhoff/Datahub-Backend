import { AuditAction } from './audit-action.enum';

export interface LogActionParams {
  action: AuditAction;
  userId: number;
  tenantId?: number;
  featureId?: number;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  modifiedFields?: string[];
}
