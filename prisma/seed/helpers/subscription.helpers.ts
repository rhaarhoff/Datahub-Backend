// prisma/seed/helpers/subscription.helpers.ts

import { PrismaClient } from '@prisma/client';
import { subscriptionPlanData } from '../data/seedData'; // Import subscription plan data

const prisma = new PrismaClient();

export async function createSubscriptionPlans() {
  try {
    await prisma.subscriptionPlan.createMany({
      data: subscriptionPlanData, // Use imported subscription plan data
      skipDuplicates: true, // Skip duplicates to avoid conflicts
    });
    console.log('Subscription plans created successfully');
  } catch (error) {
    console.error('Error creating subscription plans:', error);
    throw error;
  }
}

// Assign features to subscription plans
export async function assignFeaturesToPlans(features: any) {
  try {
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
    console.log('Features assigned to subscription plans successfully');
  } catch (error) {
    console.error('Error assigning features to plans:', error);
    throw error;
  }
}
