// src/tenant/tenant-role/models/tenant-role.model.ts
export class TenantRole {
    id: number;
    roleName: string;
    tenantId: number;
    inheritedRoleIds?: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  