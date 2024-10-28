import { PrismaClient } from '@prisma/client';
import { roleData, rolePermissionsMap } from '../data/seedData'; // Import seed data

const prisma = new PrismaClient();

// Create roles
export async function createRoles(): Promise<void> {
  try {
    await prisma.$transaction(async (txPrisma) => {
      await txPrisma.role.createMany({
        data: roleData, // Use imported role data
        skipDuplicates: true, // Skip duplicate role names to avoid conflict
      });
    });
    console.log('Roles created successfully.');
  } catch (error) {
    console.error('Error creating roles:', error);
    throw new Error(`Failed to create roles: ${error.message}`);
  }
}

// Assign permissions to roles
export async function assignPermissionsToRoles(): Promise<void> {
  try {
    await prisma.$transaction(async (txPrisma) => {
      // Fetch all permissions and create a map of name -> permission ID
      const allPermissions = await txPrisma.permission.findMany();
      const permissionMap: Record<string, { id: number }> = allPermissions.reduce(
        (acc, permission) => {
          acc[permission.name] = { id: permission.id };
          return acc;
        },
        {} as Record<string, { id: number }>
      );

      console.log('Available permissions:', permissionMap); // Add this to verify permissions

      // Loop through each role and its permissions
      for (const [roleName, permissions] of Object.entries(rolePermissionsMap)) {
        const role = await txPrisma.role.findUnique({ where: { name: roleName as string } });

        if (!role) {
          console.warn(`Role not found: ${roleName}`);
          continue; // Skip if the role is not found
        }

        console.log(`Assigning permissions to role: ${roleName}`);
        console.log(`Permissions for role: ${permissions.join(', ')}`);

        // Map the permissions to their IDs using the permissionMap
        const validPermissions = permissions
          .map(permissionName => {
            const permission = permissionMap[permissionName];
            if (!permission) {
              console.warn(`Permission not found: ${permissionName}`);
            }
            return permission;
          })
          .filter(Boolean); // Filter out invalid permissions

        if (validPermissions.length > 0) {
          // Update the role to connect the valid permissions
          await txPrisma.role.update({
            where: { id: role.id },
            data: {
              permissions: {
                connect: validPermissions.map(p => ({ id: p.id })), // Connect permissions by IDs
              },
            },
          });
          console.log(`Permissions assigned to role: ${roleName} - ${permissions.join(', ')}`);
        } else {
          console.warn(`No valid permissions found for role: ${roleName}`);
        }
      }
    });
  } catch (error) {
    console.error('Error assigning permissions to roles:', error);
    throw new Error(`Failed to assign permissions to roles: ${error.message}`);
  }
}


// Main seeding script
async function main(): Promise<void> {
  try {
    console.log('Starting role and permission seeding...');
    await createRoles();
    await assignPermissionsToRoles();
    console.log('Roles and permissions have been seeded successfully.');
  } catch (e) {
    console.error('Error during seeding:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error in seeding script:', e);
  process.exit(1);
});
