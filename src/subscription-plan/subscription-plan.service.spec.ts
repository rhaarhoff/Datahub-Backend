import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlanService } from './subscription-plan.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { SubscriptionPlanInsertException } from '../common/exceptions/subscription-plan-insert.exception';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionPlanUpdateException } from '../common/exceptions/subscription-plan-update.exception';
import { BillingCycle, TenantStatus } from '@prisma/client';

describe('SubscriptionPlanService', () => {
  let service: SubscriptionPlanService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlanService,
        {
          provide: PrismaService,
          useValue: {
            subscriptionPlan: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            tenant: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            set: jest.fn(),
            clear: jest.fn(),
            get: jest.fn(),
            generateCacheKey: jest.fn(),
            getTTLForFeature: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should successfully create a subscription plan', async () => {
    const createSubscriptionPlanDto: CreateSubscriptionPlanDto = {
      name: 'Test Plan',
      description: 'A test description', // Add description as required
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
    };

    const mockPlan = {
      id: 1,
      ...createSubscriptionPlanDto,
      trialPeriodDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    jest.spyOn(prismaService.subscriptionPlan, 'create').mockResolvedValue(mockPlan);

    const result = await service.create(createSubscriptionPlanDto);

    expect(result).toEqual(mockPlan);
    expect(prismaService.subscriptionPlan.create).toHaveBeenCalledWith({
      data: createSubscriptionPlanDto,
    });
  });

  it('should throw SubscriptionPlanInsertException on failure', async () => {
    jest.spyOn(prismaService.subscriptionPlan, 'create').mockRejectedValue(new Error('Insert failed'));

    const createSubscriptionPlanDto: CreateSubscriptionPlanDto = {
      name: 'Test Plan',
      description: 'A test description', // Add description as required
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
    };

    await expect(service.create(createSubscriptionPlanDto)).rejects.toThrow(
      SubscriptionPlanInsertException,
    );
  });

  it('should retrieve all active subscription plans', async () => {
    const mockPlans = [
      {
        id: 1,
        name: 'Test Plan 1',
        description: 'Description 1',
        price: 9.99,
        billingCycle: BillingCycle.MONTHLY,
        trialPeriodDays: 14,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 2,
        name: 'Test Plan 2',
        description: 'Description 2',
        price: 19.99,
        billingCycle: BillingCycle.ANNUAL,
        trialPeriodDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    jest.spyOn(prismaService.subscriptionPlan, 'findMany').mockResolvedValue(mockPlans);

    const result = await service.findAll();
    expect(result).toEqual(mockPlans);
    expect(prismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should throw NotFoundException when retrieving a non-existent subscription plan by ID', async () => {
    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue(null);

    await expect(service.findOne(1, false)).rejects.toThrow(NotFoundException);
  });

  it('should soft-delete a subscription plan', async () => {
    const mockPlan = {
      id: 1,
      name: 'Test Plan',
      description: 'Test Description',
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
      trialPeriodDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan);
    jest.spyOn(prismaService.subscriptionPlan, 'update').mockResolvedValue({
      ...mockPlan,
      deletedAt: new Date(),
    });

    const result = await service.remove(1);
    expect(result.deletedAt).not.toBeNull();
    expect(prismaService.subscriptionPlan.update).toHaveBeenCalled();
  });

  it('should restore a soft-deleted subscription plan', async () => {
    const mockPlan = {
      id: 1,
      name: 'Test Plan',
      description: 'Test Description',
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
      trialPeriodDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };

    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan);
    jest.spyOn(prismaService.subscriptionPlan, 'update').mockResolvedValue({
      ...mockPlan,
      deletedAt: null,
    });

    const result = await service.restore(1);
    expect(result.deletedAt).toBeNull();
    expect(prismaService.subscriptionPlan.update).toHaveBeenCalled();
  });

  it('should throw SubscriptionPlanUpdateException when hard deleting a plan assigned to tenants', async () => {
    const mockTenant = {
      id: 1,
      name: 'Tenant 1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      domain: 'example.com',
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: 1,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(),
      complianceLevel: 'HIPAA',
      currentUsage: 100,
      usageQuota: 500,
    };

    jest.spyOn(prismaService.tenant, 'findFirst').mockResolvedValue(mockTenant);

    await expect(service.hardRemove(1)).rejects.toThrow(
      SubscriptionPlanUpdateException,
    );
  });

  it('should permanently delete a subscription plan', async () => {
    jest.spyOn(prismaService.subscriptionPlan, 'findUnique').mockResolvedValue({
      id: 1,
      name: 'Test Plan',
      description: 'Test Description',
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
      trialPeriodDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    jest.spyOn(prismaService.tenant, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prismaService.subscriptionPlan, 'delete').mockResolvedValue(undefined);

    await service.hardRemove(1);

    expect(prismaService.subscriptionPlan.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
