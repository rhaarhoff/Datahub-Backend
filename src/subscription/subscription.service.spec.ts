import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { TenantFeatureService } from '../tenant/tenant-feature/tenant-feature.service';
import { FeatureAccessService } from '../feature-access/feature-access.service';
import { CacheService } from '../cache/cache.service';
import { Logger } from '@nestjs/common';
import { BillingCycle } from '@prisma/client';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: PrismaService;
  let tenantFeatureService: TenantFeatureService;
  let featureAccessService: FeatureAccessService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            subscriptionPlan: { findUnique: jest.fn() },
            tenant: { update: jest.fn() },
          },
        },
        {
          provide: TenantFeatureService,
          useValue: { updateTenantFeatures: jest.fn() },
        },
        {
          provide: FeatureAccessService,
          useValue: { updateFeatureAccessForRoles: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: { clear: jest.fn(), generateCacheKey: jest.fn() },
        },
        Logger,
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);
    tenantFeatureService = module.get<TenantFeatureService>(TenantFeatureService);
    featureAccessService = module.get<FeatureAccessService>(FeatureAccessService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSubscription', () => {
    it('should update the subscription plan for a tenant', async () => {
      const tenantId = 1;
      const newPlanId = 2;
      const subscriptionPlan = { id: newPlanId, billingCycle: BillingCycle.MONTHLY, name: 'Basic Plan', description: 'A basic subscription plan', price: 10, trialPeriodDays: 30, deletedAt: null, createdAt: new Date(), updatedAt: new Date() };
      const calculateSubscriptionEndDate = new Date();
      calculateSubscriptionEndDate.setMonth(calculateSubscriptionEndDate.getMonth() + 1);

      jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue(subscriptionPlan);
      jest.spyOn(prismaService.tenant, 'update').mockResolvedValue({
        id: tenantId,
        name: 'Test Tenant',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        domain: 'test.com',
        status: 'ACTIVE',
        subscriptionPlanId: newPlanId,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: calculateSubscriptionEndDate,
        complianceLevel: 'STANDARD',
        currentUsage: 0,
        usageQuota: 100,
      });
      jest.spyOn(service as any, 'calculateSubscriptionEndDate').mockReturnValue(calculateSubscriptionEndDate);
      jest.spyOn(cacheService, 'generateCacheKey').mockReturnValue('some-cache-key');

      await expect(service.updateSubscription(tenantId, newPlanId)).resolves.toEqual(
        `Subscription updated for tenant ${tenantId} to plan ${newPlanId}`,
      );

      expect(prismaService.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: newPlanId },
      });
      expect(prismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          subscriptionPlanId: newPlanId,
          subscriptionStartDate: expect.any(Date),
          subscriptionEndDate: calculateSubscriptionEndDate,
        },
      });
      expect(cacheService.clear).toHaveBeenCalledTimes(2);
      expect(tenantFeatureService.updateTenantFeatures).toHaveBeenCalledWith(tenantId, newPlanId);
      expect(featureAccessService.updateFeatureAccessForRoles).toHaveBeenCalledWith(tenantId);
    });

    it('should throw an error if subscription plan is not found', async () => {
      const tenantId = 1;
      const newPlanId = 2;

      jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue(null);

      await expect(service.updateSubscription(tenantId, newPlanId)).rejects.toThrow(
        `Subscription plan with ID ${newPlanId} not found`,
      );

      expect(prismaService.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: newPlanId },
      });
      expect(prismaService.tenant.update).not.toHaveBeenCalled();
    });
  });
});