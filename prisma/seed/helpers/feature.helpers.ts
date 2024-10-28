import { PrismaClient } from '@prisma/client';
import { casbinPolicyData } from '../data/seedData';

const prisma = new PrismaClient();

export async function seedCasbinPolicies() {
  console.log('Seeding Casbin policies...');

  try {
    // Clear existing policies and seed new ones
    await prisma.casbinRule.deleteMany();
    await prisma.casbinRule.createMany({
      data: casbinPolicyData,
    });

    console.log('Casbin policies have been successfully seeded.');
  } catch (error) {
    console.error('Error seeding Casbin policies:', error);
    throw error;
  }
}


export async function createFeatures() {
  await prisma.feature.createMany({
    data: [
      { name: 'QuickBooks Integration', description: 'Integration with QuickBooks', isPremium: true, tier: 'PRO' },
      { name: 'Advanced Reporting', description: 'Access to advanced reporting features', isPremium: true, tier: 'ENTERPRISE' },
      { name: 'Basic Dashboard', description: 'Basic dashboard access', isPremium: false, tier: 'BASIC' },
    ],
    skipDuplicates: true,
  });
}

export async function assignFeaturesToPlans() {
  const features = await prisma.feature.findMany({
    where: { name: { in: ['QuickBooks Integration', 'Advanced Reporting', 'Basic Dashboard'] } },
  });

  const plans = await prisma.subscriptionPlan.findMany({
    where: { name: { in: ['Basic', 'Pro', 'Enterprise'] } },
  });

  const [quickBooks, advancedReporting, basicDashboard] = features;

  const planUpdates = plans.map(plan => {
    const data = { features: { connect: [] } };
    if (plan.name === 'Basic' && basicDashboard) data.features.connect.push({ id: basicDashboard.id });
    if (plan.name === 'Pro' && quickBooks && basicDashboard) data.features.connect.push(
      { id: quickBooks.id }, { id: basicDashboard.id },
    );
    if (plan.name === 'Enterprise' && advancedReporting && quickBooks && basicDashboard) {
      data.features.connect.push(
        { id: advancedReporting.id }, { id: quickBooks.id }, { id: basicDashboard.id },
      );
    }
    return prisma.subscriptionPlan.update({ where: { id: plan.id }, data });
  });

  await Promise.all(planUpdates);
}