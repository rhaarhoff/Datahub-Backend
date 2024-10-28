import { PrismaClient } from '@prisma/client';
import { createRoles, assignPermissionsToRoles } from './helpers/role.helpers';
import { createPermissions } from './helpers/permission.helpers';
import { createFeatures, assignFeaturesToPlans } from './helpers/feature.helpers';
import { createSubscriptionPlans } from './helpers/subscription.helpers';
import { createTenant } from './helpers/tenant.helpers';
import { createUserWithRole } from './helpers/user.helpers';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    await prisma.$transaction(async (prisma) => {
      console.log('Starting seeding...');

      // Create roles and permissions
      await createRoles();
      await createPermissions();  // Permission seeding
      await assignPermissionsToRoles();

      // Create subscription plans and features
      await createSubscriptionPlans();
      await createFeatures();
      await assignFeaturesToPlans();

      // Create tenant and users
      const tenant = await createTenant();
      await createUserWithRole('superadmin@yolo.co.za', 'Super Admin', 1, tenant.id, 'SuperAdminPassword');
      await createUserWithRole('admin@yolo.co.za', 'Admin User', 2, tenant.id, 'AdminPassword');
      await createUserWithRole('member@yolo.co.za', 'Member User', 3, tenant.id, 'MemberPassword');

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
