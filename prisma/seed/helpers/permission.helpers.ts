import { PrismaClient } from '@prisma/client';
import { permissionData } from '../data/seedData'; // Import static permission data

const prisma = new PrismaClient();

export async function createPermissions(): Promise<void> {
  try {
    console.log('Starting permission seeding...');

    // Log the permission data to verify correctness
    console.log('Permissions to be seeded:', permissionData);

    // Seed permissions
    const result = await prisma.permission.createMany({
      data: permissionData, // Use imported permission data
      skipDuplicates: true, // Skip duplicates to avoid conflicts
    });

    // Log results after seeding
    console.log(`Permissions created successfully. Inserted: ${result.count}`);

    // Log skipped permissions
    const totalPermissions = permissionData.length;
    const skippedCount = totalPermissions - result.count;
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} duplicate permissions.`);
    }

  } catch (error) {
    console.error('Error creating permissions:', error);
    throw new Error(`Failed to seed permissions: ${error.message}`);
  }
}
