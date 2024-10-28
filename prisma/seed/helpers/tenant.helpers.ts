export async function createTenant(name: string, domain: string) {
    const existingTenant = await prisma.tenant.findUnique({ where: { name } });
    if (existingTenant) return existingTenant;
  
    const basicPlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Basic' } });
    if (!basicPlan) throw new Error('Basic plan not found');
  
    return prisma.tenant.create({
      data: {
        name,
        domain,
        status: TenantStatus.ACTIVE,
        subscriptionPlanId: basicPlan.id,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      },
    });
  }
  