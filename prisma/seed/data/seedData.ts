
import { RoleType, PermissionType, BillingCycle, TenantStatus  } from '@prisma/client';

export const tenants = [
  { name: 'Yolo Corp', domain: 'yolo.co.za', status: TenantStatus.ACTIVE },
  { name: 'Acme Corp', domain: 'acme.com', status: TenantStatus.ACTIVE },
  { name: 'MegaTech', domain: 'megatech.io', status: TenantStatus.PENDING },
  { name: 'BioPharm', domain: 'biopharm.health', status: TenantStatus.SUSPENDED },
  { name: 'Quantum Solutions', domain: 'quantum.solutions', status: TenantStatus.ACTIVE },
];

// Seed data for roles
export const roleData = [
  { name: 'SUPERADMIN', description: 'Has full access to the entire system', type: RoleType.GLOBAL },
  { name: 'ADMIN', description: 'Admin role with management access', type: RoleType.GLOBAL },
  { name: 'MEMBER', description: 'Standard user with limited access', type: RoleType.GLOBAL },
  { name: 'OWNER', description: 'Owner of the tenant, with most permissions', type: RoleType.TENANT },
  { name: 'GUEST', description: 'Guest user with view-only access', type: RoleType.TENANT },
  { name: 'FINANCEADMIN', description: 'Manages tenant finance operations', type: RoleType.TENANT },
  { name: 'SECURITYADMIN', description: 'Responsible for security and compliance enforcement', type: RoleType.GLOBAL },
  { name: 'ITADMIN', description: 'Manages IT and infrastructure operations', type: RoleType.GLOBAL },
  { name: 'COMPLIANCEOFFICER', description: 'Responsible for ensuring compliance (HIPAA, GDPR)', type: RoleType.GLOBAL },
];

// Seed data for permissions
export const permissionData = [
  { name: 'READ', description: 'Can read data', type: PermissionType.GLOBAL },
  { name: 'WRITE', description: 'Can write or modify data', type: PermissionType.GLOBAL },
  { name: 'DELETE', description: 'Can delete data', type: PermissionType.GLOBAL },
  { name: 'CREATE', description: 'Can create new entries', type: PermissionType.GLOBAL },
  { name: 'MANAGE', description: 'Has full management control', type: PermissionType.GLOBAL },
  { name: 'BILLING', description: 'Can manage billing operations', type: PermissionType.TENANT },
  { name: 'AUDIT_READ', description: 'Can read all audit logs', type: PermissionType.GLOBAL },
  { name: 'AUDIT_READ_TENANT', description: 'Can read audit logs for own tenant', type: PermissionType.TENANT },
  { name: 'AUDIT_READ_SECURITY', description: 'Can read security audit logs', type: PermissionType.GLOBAL },
  { name: 'AUDIT_READ_IT', description: 'Can read IT audit logs', type: PermissionType.GLOBAL },
  { name: 'AUDIT_READ_COMPLIANCE', description: 'Can read compliance audit logs', type: PermissionType.GLOBAL },
];

// Mapping of roles to permissions
export const rolePermissionsMap = {
  SUPERADMIN: ['READ', 'WRITE', 'DELETE', 'CREATE', 'MANAGE'],
  ADMIN: ['READ', 'WRITE', 'MANAGE'],
  MEMBER: ['READ', 'WRITE'],
  OWNER: ['READ', 'WRITE', 'MANAGE'],
  GUEST: ['READ'],
  FINANCEADMIN: ['READ', 'BILLING', 'WRITE'],
  SECURITYADMIN: ['READ', 'WRITE', 'MANAGE'],
  ITADMIN: ['READ', 'WRITE', 'MANAGE'],
  COMPLIANCEOFFICER: ['READ', 'MANAGE'],
};

// Seed data for features
export const featureData = [
  { name: 'Manage Users', description: 'Allows management of users', isPremium: true },
  { name: 'Manage Billing', description: 'Allows management of billing', isPremium: false },
  { name: 'View Analytics', description: 'Provides access to analytics dashboard', isPremium: true },
  { name: 'Security Reports', description: 'View security audit reports', isPremium: true },
  { name: 'Compliance Dashboard', description: 'View compliance-related reports and tasks', isPremium: true },
];

// Seed data for feature tiers (which features are available in which tier)
export const featureTierData = [
  {
    name: 'Basic',
    description: 'Basic tier with essential features',
    features: ['View Analytics'],
  },
  {
    name: 'Pro',
    description: 'Pro tier with additional management features',
    features: ['View Analytics', 'Manage Users'],
  },
  {
    name: 'Enterprise',
    description: 'Enterprise tier with full access to all features',
    features: ['View Analytics', 'Manage Users', 'Manage Billing', 'Security Reports'],
  },
];

// Seed data for subscription plans, linked to feature tiers
export const subscriptionPlanData = [
  {
    name: 'Basic',
    description: 'Basic plan with limited features',
    price: 10.0,
    billingCycle: BillingCycle.MONTHLY,
    featureTierName: 'Basic',
  },
  {
    name: 'Pro',
    description: 'Pro plan with more features',
    price: 30.0,
    billingCycle: BillingCycle.MONTHLY,
    trialPeriodDays: 14,
    featureTierName: 'Pro',
  },
  {
    name: 'Enterprise',
    description: 'Enterprise plan with full access to all features',
    price: 100.0,
    billingCycle: BillingCycle.ANNUAL,
    featureTierName: 'Enterprise',
  },
];

// Seed data for tenant features
export const tenantFeatureData = [
  { tenantName: 'Yolo Corp', featureName: 'Manage Users' },
  { tenantName: 'Yolo Corp', featureName: 'View Analytics' },
  { tenantName: 'Acme Corp', featureName: 'Manage Billing' },
  { tenantName: 'BioPharm', featureName: 'Security Reports' },
  { tenantName: 'Quantum Solutions', featureName: 'Compliance Dashboard' },
];

// Seed data for role feature access (which role has access to which feature)
export const roleFeatureAccessMap = {
  SUPERADMIN: {
    Basic: ['View Analytics'],
    Pro: ['View Analytics', 'Manage Users'],
    Enterprise: ['View Analytics', 'Manage Users', 'Manage Billing'],
  },
  ADMIN: {
    Basic: ['View Analytics'],
    Pro: ['View Analytics', 'Manage Users'],
    Enterprise: ['View Analytics', 'Manage Users'],
  },
  MEMBER: {
    Basic: ['View Analytics'],
    Pro: ['View Analytics'],
    Enterprise: ['View Analytics'],
  },
  GUEST: {
    Basic: ['View Analytics'],
    Pro: [],
    Enterprise: [],
  },
};

// Casbin RBAC, ABAC, and CBAC policy data
export const casbinPolicyData = [
  // Role-Based Access Control (RBAC)
  // SUPERADMIN has full access to all tenant and audit-related operations
  { ptype: 'p', v0: 'SUPERADMIN', v1: '/tenant-features/update', v2: 'update', v3: 'tenant101', v4: 'premium_plan', v5: 'true' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: '/audit', v2: 'read' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: '/audit/tenant/:tenantId', v2: 'read' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: '/audit/feature/:featureId', v2: 'read' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: '/audit/user/:userId', v2: 'read' },

  // ADMIN has tenant-specific access to update and audit logs
  { ptype: 'p', v0: 'ADMIN', v1: '/tenant-features/update', v2: 'update', v3: 'tenant101', v4: 'basic_plan', v5: 'true' },
  { ptype: 'p', v0: 'ADMIN', v1: '/audit', v2: 'read' },
  { ptype: 'p', v0: 'ADMIN', v1: '/audit/tenant/:tenantId', v2: 'read', v3: 'tenantId == :tenantId' }, // Can only read logs for their own tenant
  { ptype: 'p', v0: 'ADMIN', v1: '/audit/feature/:featureId', v2: 'read' },  // ABAC is handled separately for feature access

  // MEMBER has limited read access to tenant features and audit logs
  { ptype: 'p', v0: 'MEMBER', v1: '/tenant-features/get', v2: 'read', v3: 'tenant101', v4: 'basic_plan', v5: 'true' },
  { ptype: 'p', v0: 'MEMBER', v1: '/audit/tenant/:tenantId', v2: 'read', v3: 'false' }, // No read access to audit logs
  { ptype: 'p', v0: 'MEMBER', v1: 'feature_data', v2: 'read', v3: 'subscriptionPlan == "Pro"' },
  
  // GUEST has read-only access to basic features, but no access to audit logs
  { ptype: 'p', v0: 'GUEST', v1: '/tenant-features/get', v2: 'read', v3: 'tenant101', v4: 'basic_plan', v5: 'true' },
  { ptype: 'p', v0: 'GUEST', v1: '/audit/tenant/:tenantId', v2: 'read', v3: 'false' },

  // Attribute-Based Access Control (ABAC)
  // Control access based on attributes like subscription plans and compliance level
  { ptype: 'p', v0: 'MEMBER', v1: 'feature_data', v2: 'read', v3: 'subscriptionPlan == "Pro"' },  // Can read feature data if on "Pro" plan
  { ptype: 'p', v0: 'MEMBER', v1: 'feature_data', v2: 'write', v3: 'subscriptionPlan == "Enterprise"' },  // Can write only if on "Enterprise" plan
  { ptype: 'p', v0: 'ADMIN', v1: '/audit/feature/:featureId', v2: 'read', v3: 'subscriptionPlan == "Enterprise"' },  // Can view audit logs only if on "Enterprise" plan

  // Compliance-Based Access Control (CBAC)
  // Access based on compliance level
  { ptype: 'p', v0: 'SecurityAdmin', v1: 'compliance_data', v2: 'access', v3: 'complianceLevel == "HIPAA"' },
  { ptype: 'p', v0: 'GDPRComplianceOfficer', v1: 'compliance_data', v2: 'access', v3: 'complianceLevel == "GDPR"' },

  // Separation of Duties (SoD) Constraints
  // Prevent conflicting roles from being assigned to the same user
  { ptype: 'g2', v0: 'APPROVER', v1: 'FINANCEADMIN', v2: 'conflict' },  // An APPROVER cannot also be a FINANCEADMIN
  { ptype: 'g2', v0: 'SECURITYADMIN', v1: 'AUDITOR', v2: 'conflict' },  // A SECURITYADMIN cannot also be an AUDITOR
  { ptype: 'g2', v0: 'ITADMIN', v1: 'SECURITYADMIN', v2: 'conflict' },  // An ITADMIN cannot also be a SECURITYADMIN
];


// Seed data for users
export const users = [
  {
    email: 'superadmin@yolo.co.za',
    name: 'Super Admin',
    roleName: 'SUPERADMIN',
    tenantName: 'Yolo Corp',
    password: 'SuperAdminPassword',
  },
  {
    email: 'admin@yolo.co.za',
    name: 'Admin User',
    roleName: 'ADMIN',
    tenantName: 'Yolo Corp',
    password: 'AdminPassword',
  },
  {
    email: 'member@acme.com',
    name: 'Member User',
    roleName: 'MEMBER',
    tenantName: 'Acme Corp',
    password: 'MemberPassword',
  },
  {
    email: 'guest@megatech.io',
    name: 'Guest User',
    roleName: 'GUEST',
    tenantName: 'MegaTech',
    password: 'GuestPassword',
  },
  {
    email: 'financeadmin@biopharm.health',
    name: 'Finance Admin',
    roleName: 'FINANCEADMIN',
    tenantName: 'BioPharm',
    password: 'FinancePassword',
  },
  {
    email: 'securityadmin@quantum.solutions',
    name: 'Security Admin',
    roleName: 'SECURITYADMIN',
    tenantName: 'Quantum Solutions',
    password: 'SecurityPassword',
  },
];




// Casbin RBAC, ABAC, and CBAC policy data
/* export const casbinPolicyData = [
  // Role-Based Access Control (RBAC)
  { ptype: 'p', v0: 'SUPERADMIN', v1: 'data', v2: 'read' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: 'data', v2: 'write' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: 'data', v2: 'delete' },
  { ptype: 'p', v0: 'SUPERADMIN', v1: 'data', v2: 'manage' },
  { ptype: 'p', v0: 'ADMIN', v1: 'data', v2: 'read' },
  { ptype: 'p', v0: 'ADMIN', v1: 'data', v2: 'write' },
  { ptype: 'p', v0: 'ADMIN', v1: 'data', v2: 'manage' },
  { ptype: 'p', v0: 'MEMBER', v1: 'data', v2: 'read' },
  { ptype: 'p', v0: 'MEMBER', v1: 'data', v2: 'write' },
  { ptype: 'p', v0: 'GUEST', v1: 'data', v2: 'read' },

  // Attribute-Based Access Control (ABAC)
  { ptype: 'p', v0: 'ADMIN', v1: 'tenant_data', v2: 'read', v3: 'tenantId' },
  { ptype: 'p', v0: 'OWNER', v1: 'tenant_data', v2: 'write', v3: 'tenantId' },
  { ptype: 'p', v0: 'MEMBER', v1: 'feature_data', v2: 'read', v3: 'subscriptionPlan == "Pro"' },
  { ptype: 'p', v0: 'MEMBER', v1: 'feature_data', v2: 'write', v3: 'subscriptionPlan == "Enterprise"' },
  { ptype: 'p', v0: 'GUEST', v1: 'feature_data', v2: 'read', v3: 'subscriptionPlan == "Basic"' },
  { ptype: 'p', v0: 'TenantBillingManager', v1: 'billing', v2: 'manage', v3: 'tenantId' },

  // Compliance-Based Access Control (CBAC)
  { ptype: 'p', v0: 'SecurityAdmin', v1: 'compliance_data', v2: 'access', v3: 'complianceLevel == "HIPAA"' },
  { ptype: 'p', v0: 'GDPRComplianceOfficer', v1: 'compliance_data', v2: 'access', v3: 'complianceLevel == "GDPR"' },
  { ptype: 'p', v0: 'PCIComplianceOfficer', v1: 'compliance_data', v2: 'access', v3: 'complianceLevel == "PCI-DSS"' },

  // Compliance enforcement for tenant features
  { ptype: 'p', v0: 'SecurityAdmin', v1: 'tenant_data', v2: 'manage', v3: 'complianceLevel == "SOC2"' },
  { ptype: 'p', v0: 'HIPAAOfficer', v1: 'health_data', v2: 'access', v3: 'complianceLevel == "HIPAA"' },

  // Separation of Duties (SoD) Constraints
  { ptype: 'g2', v0: 'APPROVER', v1: 'FINANCEADMIN', v2: 'conflict' }, // Finance admins cannot approve their own transactions
  { ptype: 'g2', v0: 'PAYMENTADMIN', v1: 'FINANCEADMIN', v2: 'conflict' }, // Payment admins cannot be finance admins
  { ptype: 'g2', v0: 'SECURITYADMIN', v1: 'AUDITOR', v2: 'conflict' }, // Security admins cannot be auditors
  { ptype: 'g2', v0: 'ITADMIN', v1: 'SECURITYADMIN', v2: 'conflict' }, // IT admins cannot be security admins
  { ptype: 'g2', v0: 'COMPLIANCEOFFICER', v1: 'DATAADMIN', v2: 'conflict' }, // Compliance officers cannot modify data
  { ptype: 'g2', v0: 'DATAOFFICER', v1: 'ITADMIN', v2: 'conflict' }, // Data officers cannot have IT admin roles
  { ptype: 'g2', v0: 'PAYMENTADMIN', v1: 'PAYMENTAPPROVER', v2: 'conflict' }, // Payment admins cannot approve their own transactions
  { ptype: 'g2', v0: 'TenantAdmin', v1: 'TenantBillingManager', v2: 'conflict' }, // Tenant admins cannot manage billing
  { ptype: 'g2', v0: 'SOC2Auditor', v1: 'SECURITYADMIN', v2: 'conflict' }, // SOC2 auditors cannot be security admins
  { ptype: 'g2', v0: 'GDPRComplianceOfficer', v1: 'DATAOFFICER', v2: 'conflict' }, // GDPR officers cannot modify data directly
  { ptype: 'g2', v0: 'HIPAAOfficer', v1: 'HEALTHADMIN', v2: 'conflict' }, // HIPAA officers cannot have admin access to health data

  // SoD enforcing the 4-Eyes Principle
  { ptype: 'g2', v0: 'APPROVER', v1: 'OPERATOR', v2: 'conflict' }, // Operators cannot approve their own operations
  { ptype: 'g2', v0: 'APPROVER', v1: 'CREATOR', v2: 'conflict' }, // Creators cannot approve their own actions

  // Cloud Operations SoD
  { ptype: 'g2', v0: 'CLOUDENGINEER', v1: 'CLOUDSECURITYADMIN', v2: 'conflict' }, // Cloud engineers cannot have security admin access
]; */

