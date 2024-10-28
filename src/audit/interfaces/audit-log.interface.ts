export interface AuditLog {
    id: number;
    action: string; // or AuditAction enum
    userId?: number;
    tenantId?: number;
    featureId?: number;
    impersonatorId?: number;
    impersonatedId?: number;
    before?: any; // Store the state before the change as JSON
    after?: any;  // Store the state after the change as JSON
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
  
    // Relations
    user?: {
      id: number;
      name: string | null;
      email: string;
    };
  
    impersonator?: {
      id: number;
      name: string | null;
      email: string;
    };
  
    impersonatedUser?: {
      id: number;
      name: string | null;
      email: string;
    };
  
    tenant?: {
      id: number;
      name: string;
      domain?: string;
      status: string; // TenantStatus enum can be used
      subscriptionStartDate?: Date;
      subscriptionEndDate?: Date;
      complianceLevel?: string;
      currentUsage?: number;
      usageQuota?: number;
      deletedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
  
    feature?: {
      id: number;
      name: string;
      description?: string;
      isPremium: boolean;
      enabled: boolean;
      deletedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
  }
  