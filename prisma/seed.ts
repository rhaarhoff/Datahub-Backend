import {
  PrismaClient,
  RoleName,
  PermissionName,
  FeatureTier,
  BillingCycle,
  TenantStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';



const prisma = new PrismaClient();

// Helper function to assign permissions to roles
async function assignPermissions(
  roleName: RoleName,
  permissions: PermissionName[],
) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const permissionRecords = await prisma.permission.findMany({
    where: { name: { in: permissions } },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found.`);
  }
  if (permissionRecords.length === 0) {
    throw new Error(`Permissions not found for ${roleName}`);
  }

  await prisma.role.update({
    where: { id: role.id },
    data: {
      permissions: {
        connect: permissionRecords.map((p) => ({ id: p.id })),
      },
    },
  });
}

// Helper function to create roles and return them
async function createRoles() {
  await prisma.role.createMany({
    data: [
      {
        name: RoleName.SUPERADMIN,
        description: 'Has full access to the entire system',
      },
      {
        name: RoleName.ADMIN,
        description: 'Admin role with management access',
      },
      {
        name: RoleName.MEMBER,
        description: 'Standard user with limited access',
      },
      {
        name: RoleName.OWNER,
        description: 'Owner of the tenant, with most permissions',
      },
      { name: RoleName.GUEST, description: 'Guest user with view-only access' },
    ],
    skipDuplicates: true,
  });

  // Fetch the created roles
  return prisma.role.findMany({
    where: {
      name: {
        in: [
          RoleName.SUPERADMIN,
          RoleName.ADMIN,
          RoleName.MEMBER,
          RoleName.GUEST,
        ],
      },
    },
  });
}

// Helper function to create subscription plans
async function createSubscriptionPlans() {
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'Basic',
        description: 'Basic plan with limited features',
        price: 10.0,
        billingCycle: BillingCycle.MONTHLY,
      },
      {
        name: 'Pro',
        description: 'Pro plan with more features',
        price: 30.0,
        billingCycle: BillingCycle.MONTHLY,
        trialPeriodDays: 14,
      },
      {
        name: 'Enterprise',
        description: 'Enterprise plan with full access to all features',
        price: 100.0,
        billingCycle: BillingCycle.ANNUAL,
      },
    ],
    skipDuplicates: true,
  });
}

// Helper function to create features
async function createFeatures() {
  await prisma.feature.createMany({
    data: [
      {
        name: 'QuickBooks Integration',
        description: 'Integration with QuickBooks',
        isPremium: true,
        tier: FeatureTier.PRO,
      },
      {
        name: 'Advanced Reporting',
        description: 'Access to advanced reporting features',
        isPremium: true,
        tier: FeatureTier.ENTERPRISE,
      },
      {
        name: 'Basic Dashboard',
        description: 'Basic dashboard access',
        isPremium: false,
        tier: FeatureTier.BASIC,
      },
    ],
    skipDuplicates: true,
  });

  // Return the features for assignment
  return prisma.feature.findMany({
    where: {
      name: {
        in: ['QuickBooks Integration', 'Advanced Reporting', 'Basic Dashboard'],
      },
    },
  });
}

// Helper function to assign features to plans
async function assignFeaturesToPlans(features: any) {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { name: { in: ['Basic', 'Pro', 'Enterprise'] } },
  });

  const [quickBooks, advancedReporting, basicDashboard] = features;

  const planUpdates = plans.map((plan) => {
    const data = { features: { connect: [] } };
    if (plan.name === 'Basic' && basicDashboard) {
      data.features.connect.push({ id: basicDashboard.id });
    }
    if (plan.name === 'Pro' && quickBooks && basicDashboard) {
      data.features.connect.push(
        { id: quickBooks.id },
        { id: basicDashboard.id },
      );
    }
    if (
      plan.name === 'Enterprise' &&
      advancedReporting &&
      quickBooks &&
      basicDashboard
    ) {
      data.features.connect.push(
        { id: advancedReporting.id },
        { id: quickBooks.id },
        { id: basicDashboard.id },
      );
    }
    return prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data,
    });
  });

  await Promise.all(planUpdates);
}

// Helper function to create tenant
async function createTenant() {
  // Check if the tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { name: 'Yolo Corp' },
  });

  if (existingTenant) {
    console.log('Tenant already exists:', existingTenant.name);
    return existingTenant; // Return the existing tenant
  }

  // Find the Basic plan
  const basicPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: 'Basic' },
  });

  if (!basicPlan) throw new Error('Basic plan not found');

  // Create the tenant if it doesn't exist
  return prisma.tenant.create({
    data: {
      name: 'Yolo Corp',
      domain: 'yolo.co.za',
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: basicPlan.id,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1),
      ),
    },
  });
}

// Helper function to create permissions
async function createPermissions() {
  await prisma.permission.createMany({
    data: [
      { name: PermissionName.READ, description: 'Can read data' },
      { name: PermissionName.WRITE, description: 'Can write or modify data' },
      { name: PermissionName.DELETE, description: 'Can delete data' },
      { name: PermissionName.CREATE, description: 'Can create new entries' },
      {
        name: PermissionName.MANAGE,
        description: 'Has full management control',
      },
    ],
    skipDuplicates: true,
  });
}



// Helper function to create users with roles
async function createUserWithRole(
  email: string,
  name: string,
  roleId: number,
  tenantId: number,
  plainPassword: string,
) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // Hash the password with bcryptjs

    return prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword, // Store the hashed password
        tenants: {
          create: { tenantId },
        },
        roles: {
          create: {
            tenantId,
            roleId,
            isPrimaryRole: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Error hashing password:', err);
    throw err; // Throw error to help debugging
  }
}

// Helper function to assign tenant-specific permissions to tenant roles
async function assignTenantPermissions(
  tenantId: number,
  roleName: string,
  permissions: string[],
) {
  const tenantRole = await prisma.tenantRole.findUnique({
    where: { name_tenantId: { name: roleName, tenantId } },
  });

  const permissionRecords = await prisma.tenantPermission.findMany({
    where: { name: { in: permissions }, tenantId },
  });

  if (!tenantRole) {
    throw new Error(`Tenant Role ${roleName} not found for tenant ${tenantId}`);
  }
  if (permissionRecords.length === 0) {
    throw new Error(`Tenant permissions not found for ${roleName}`);
  }

  await prisma.tenantRole.update({
    where: { id: tenantRole.id },
    data: {
      permissions: {
        connect: permissionRecords.map((p) => ({ id: p.id })),
      },
    },
  });
}

// Helper function to create tenant-specific roles and permissions
async function createTenantRolesAndPermissions(tenantId: number) {
  // Create tenant-specific permissions
  const tenantPermissions = ['VIEW_PROJECT', 'EDIT_INVOICE', 'MANAGE_USERS'];
  const permissionRecords = await prisma.tenantPermission.createMany({
    data: tenantPermissions.map((name) => ({
      name,
      tenantId,
      description: `${name} permission for tenant ${tenantId}`,
    })),
    skipDuplicates: true,
  });

  // Create tenant-specific roles
  const tenantRoles = ['Manager', 'Employee', 'Billing Manager'];
  const roleRecords = await prisma.tenantRole.createMany({
    data: tenantRoles.map((name) => ({
      name,
      tenantId,
      description: `${name} role for tenant ${tenantId}`,
    })),
    skipDuplicates: true,
  });

  // Assign permissions to tenant roles
  const tenantRolePermissionsMap = {
    Manager: ['VIEW_PROJECT', 'EDIT_INVOICE', 'MANAGE_USERS'],
    Employee: ['VIEW_PROJECT'],
    'Billing Manager': ['VIEW_PROJECT', 'EDIT_INVOICE'],
  };

  await Promise.all(
    Object.entries(tenantRolePermissionsMap).map(([roleName, permissions]) =>
      assignTenantPermissions(tenantId, roleName, permissions),
    ),
  );
}

// Updated createTenant function to add tenant-specific roles and permissions
async function createTenantWithRolesAndPermissions() {
  // Create or find the tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: 'Yolo Corp' },
    update: {},
    create: {
      name: 'Yolo Corp',
      domain: 'yolo.co.za',
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: (await prisma.subscriptionPlan.findFirst({
        where: { name: 'Basic' },
      })).id,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });

  // Create tenant-specific roles and permissions
  await createTenantRolesAndPermissions(tenant.id);

  return tenant;
}

// Main function to orchestrate the seeding process within a transaction
async function main(): Promise<void> {
  try {
    await prisma.$transaction(async (prisma) => {
      console.log('Starting seeding...');

      // 1. Create roles and permissions
      console.log('Creating roles...');
      const roles = await createRoles();
      const roleMap = roles.reduce((acc, role) => {
        acc[role.name] = role.id;
        return acc;
      }, {});

      await createPermissions();

      // 2. Assign permissions to roles dynamically
      const rolePermissionsMap = {
        [RoleName.SUPERADMIN]: [
          PermissionName.READ,
          PermissionName.WRITE,
          PermissionName.DELETE,
          PermissionName.CREATE,
          PermissionName.MANAGE,
        ],
        [RoleName.ADMIN]: [
          PermissionName.READ,
          PermissionName.WRITE,
          PermissionName.MANAGE,
        ],
        [RoleName.MEMBER]: [PermissionName.READ, PermissionName.WRITE],
        [RoleName.GUEST]: [PermissionName.READ],
      };

      console.log('Assigning permissions to roles...');
      await Promise.all(
        Object.entries(rolePermissionsMap).map(([roleName, permissions]) =>
          assignPermissions(
            roleName as RoleName,
            permissions as PermissionName[],
          ),
        ),
      );

      // 3. Create subscription plans and features
      console.log('Creating subscription plans and features...');
      await createSubscriptionPlans();
      const features = await createFeatures();

      // 4. Assign features to subscription plans
      console.log('Assigning features to plans...');
      await assignFeaturesToPlans(features);

      // 5. Create a tenant
      console.log('Creating tenant...');
      const tenant = await createTenant();

      // 6. Create users and assign roles
      console.log('Creating users and assigning roles...');
      await createUserWithRole(
        'superadmin@yolo.co.za',
        'Super Admin',
        roleMap[RoleName.SUPERADMIN],
        tenant.id,
        'SuperAdminPassword',
      );
      await createUserWithRole(
        'admin@yolo.co.za',
        'Admin User',
        roleMap[RoleName.ADMIN],
        tenant.id,
        'AdminPassword',
      );
      await createUserWithRole(
        'member@yolo.co.za',
        'Member User',
        roleMap[RoleName.MEMBER],
        tenant.id,
        'MemberPassword',
      );
      await createUserWithRole(
        'guest@yolo.co.za',
        'Guest User',
        roleMap[RoleName.GUEST],
        tenant.id,
        'GuestPassword',
      );

      console.log('Seeding completed successfully.');
    });
  } catch (e) {
    console.error('Seeding error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
