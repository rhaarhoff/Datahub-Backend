// src/tenant/tenant-role/models/tenant-role.model.ts
import { TenantPermission } from '../../tenant-permission/models/tenant-permission.model';
import { UserRole } from '../../../user/user-role/models/user-role.model';
import { Tenant } from '../../models/tenant.model';

export class TenantRole {
  id: number;
  roleName: string;
  description?: string;
  tenantId: number;
  inheritedRoleIds?: number[]; // Updated to be an array of integers, representing role inheritance
  permissions?: TenantPermission[]; // Optional, assuming you want to show related permissions
  users?: UserRole[]; // Optional, assuming you want to show users with this role
  tenant?: Tenant; // Optional, if you want to include tenant information
  createdAt: Date;
  updatedAt: Date;
}
