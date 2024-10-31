// src/common/types/types.ts

// Define minimal versions of related models to match selected fields from Prisma

export interface PartialUser {
    id: number;
    tenantId: number;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
  }
  
  export interface PartialTenantFeature {
    id: number;
    tenantId: number;
    featureId: number;
    enabled: boolean;
    subscribedAt: Date;
  }
  
  export interface PartialUserRole {
    id: number;
    roleName: string;
    tenantId: number;
  }
  