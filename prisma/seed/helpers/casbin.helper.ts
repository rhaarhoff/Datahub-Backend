import { PrismaClient } from '@prisma/client';
import { casbinPolicyData } from '../data/seedData'; // Import the policy data

const prisma = new PrismaClient();

export async function seedCasbinPolicies() {
  try {
    console.log('Seeding Casbin policies...');

    // Using createMany to batch insert Casbin policies
    await prisma.casbinRule.createMany({
      data: casbinPolicyData.map((policy) => ({
        ptype: policy.ptype,
        v0: policy.v0,
        v1: policy.v1,
        v2: policy.v2,
        v3: policy.v3,
        v4: policy.v4,
        v5: policy.v5,
      })),
      skipDuplicates: true, // Optional: To skip duplicates
    });

    console.log('Casbin policies seeded successfully!');
  } catch (error) {
    console.error('Error seeding Casbin policies:', error);
  } finally {
    await prisma.$disconnect();
  }
}
