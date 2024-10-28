import { Test, TestingModule } from '@nestjs/testing';
import { TenantFeatureService } from './tenant-feature.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import { SubscriptionPlanInvalidException } from '../common/exceptions/subscription-plan-invalid.exception';
import { TenantFeatureUpdateException } from '../common/exceptions/tenant-feature-update.exception';
import { TenantFeatureInsertException } from '../common/exceptions/tenant-feature-insert.exception';
import { BillingCycle } from '@prisma/client';
import { CacheManagerService } from 'src/cache/cache-manager.service';

describe('TenantFeatureService', () => {
  let service: TenantFeatureService;
  let prisma: PrismaService;
  let cacheService: CacheService;
  let cacheManagerService: CacheManagerService;

  const mockPrismaService = {
    subscriptionPlan: {
      findUnique: jest.fn(),
    },
    tenantFeature: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
    generateCacheKey: jest.fn(() => 'mock-cache-key'),
    getTTLForFeature: jest.fn(() => 3600),
  };

  const mockCacheManagerService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  const mockCasbinHelperService = {
    enforceAuthorization: jest.fn(),
  };

  const mockSubscriptionPlan = {
  const mockSubscriptionPlan = {
    id: 1,
    name: 'Pro Plan',
    description: 'Pro plan with advanced features',
    price: 29.99,
    billingCycle: BillingCycle.MONTHLY,
    trialPeriodDays: 14,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    features: [
      { id: 1, name: 'Manage Users' },
      {
        provide: CacheManagerService,
        useValue: mockCacheManagerService,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // Reset mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
      TenantFeatureService,
      {
        provide: PrismaService,
        useValue: {
        ...mockPrismaService,
        $transaction: jest
          .fn()
        { provide: CasbinHelperService, useValue: mockCasbinHelperService },
      ],
    }).compile();
      },
      { provide: CacheService, useValue: mockCacheService },
      { provide: CacheManagerService, useValue: mockCacheManagerService },
      ],
    }).compile();

    service = module.get<TenantFeatureService>(TenantFeatureService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    cacheManagerService = module.get<CacheManagerService>(CacheManagerService);
    const enforceAuthorizationSpy = jest.spyOn(mockCasbinHelperService, 'enforceAuthorization');
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call casbinHelper to enforce authorization', async () => {
    const enforceAuthorizationSpy = jest.spyOn(CasbinHelperService, 'enforceAuthorization');
    
    // Mock other dependencies as needed
    jest.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValueOnce(mockSubscriptionPlan);
    
    await service.updateTenantFeatures(101, 1, 10); // Added userId argument
  
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith(10, '/tenant-features/update', 'update', 101);
  });

  describe('updateTenantFeatures', () => {
    it('should successfully update tenant features', async () => {
      jest
        .spyOn(prisma.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(mockSubscriptionPlan);
      jest
        .spyOn(prisma.tenantFeature, 'deleteMany')
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(prisma.tenantFeature, 'createMany')
        .mockResolvedValueOnce(undefined);

      const tenantFeaturesData = [
        { tenantId: 101, featureId: 1 },
        // Add more feature data as needed
      ];

      const result = await service.updateTenantFeatures(101, 1, 10); // Added userId argument

      expect(prisma.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { features: true },
      });
      expect(prisma.tenantFeature.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: 101 },
      });
      expect(prisma.tenantFeature.createMany).toHaveBeenCalledWith({
        data: tenantFeaturesData,
      });
      expect(result).toBe('Tenant features updated for tenant 101 with plan 1');
    });

    it('should throw SubscriptionPlanInvalidException if subscription plan is invalid', async () => {
      jest
        .spyOn(prisma.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(service.updateTenantFeatures(101, 999, 10)) // Added userId argument
        .rejects.toThrow(SubscriptionPlanInvalidException);

      jest
        .spyOn(prisma.tenantFeature, 'deleteMany')
        .mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.updateTenantFeatures(101, 1, 10)) // Added userId argument
        .rejects.toThrow(
          new TenantFeatureUpdateException(
            101,
            'Failed to update tenant features for tenant 101',
          ),
        );

      expect(prisma.tenantFeature.deleteMany).toHaveBeenCalled();
      expect(prisma.tenantFeature.createMany).not.toHaveBeenCalled();
    });

    it('should throw TenantFeatureInsertException if bulk insert fails', async () => {
      jest
        .spyOn(prisma.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(mockSubscriptionPlan);
      jest
        .spyOn(prisma.tenantFeature, 'deleteMany')
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(prisma.tenantFeature, 'createMany')
        .mockRejectedValueOnce(new Error('Bulk Insert Failed'));

      await expect(service.updateTenantFeatures(101, 1, 10)) // Added userId argument
        .rejects.toThrow(
          new TenantFeatureInsertException(
            'Failed to bulk insert tenant features.',
          ),
        );

      expect(prisma.tenantFeature.deleteMany).toHaveBeenCalled();
      expect(prisma.tenantFeature.createMany).toHaveBeenCalled();
    });

    it('should handle cache clearing errors gracefully and still proceed', async () => {
      jest
        .spyOn(cacheService, 'clear')
        .mockRejectedValueOnce(new Error('Cache clear failed'));
      jest
        .spyOn(prisma.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(mockSubscriptionPlan);
      jest
        .spyOn(prisma.tenantFeature, 'deleteMany')
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(prisma.tenantFeature, 'createMany')
        .mockResolvedValueOnce(undefined);

      const result = await service.updateTenantFeatures(101, 1, 10); // Added userId argument

      expect(cacheService.clear).toHaveBeenCalled();
      expect(result).toBe('Tenant features updated for tenant 101 with plan 1');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw SubscriptionPlanInvalidException if subscription plan has no features', async () => {
      const mockPlanWithoutFeatures = { ...mockSubscriptionPlan, features: [] };
      jest
        .spyOn(prisma.subscriptionPlan, 'findUnique')
        .mockResolvedValueOnce(mockPlanWithoutFeatures);

      await expect(service.updateTenantFeatures(101, 1, 10)) // Added userId argument
        .rejects.toThrow(
          new SubscriptionPlanInvalidException(
            'Subscription plan 1 has no features or is invalid',
          ),
        );

      expect(prisma.tenantFeature.deleteMany).not.toHaveBeenCalled();
      expect(prisma.tenantFeature.createMany).not.toHaveBeenCalled();
    });
  });

  describe('chunkArray', () => {
    it('should split an array into chunks', () => {
      const array = [1, 2, 3, 4, 5];
      const chunkSize = 2;
      const result = service['chunkArray'](array, chunkSize);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return the same array if chunk size is larger than array length', () => {
      const array = [1, 2];
      const chunkSize = 10;
      const result = service['chunkArray'](array, chunkSize);
      expect(result).toEqual([[1, 2]]);
    });
  });
});
  function mockResolvedValueOnce(mockSubscriptionPlan: { id: number; name: string; description: string; price: number; billingCycle: "MONTHLY"; trialPeriodDays: number; deletedAt: any; createdAt: Date; updatedAt: Date; features: ({ id: number; name: string; provide?: undefined; useValue?: undefined; } | { provide: typeof CacheManagerService; useValue: { get: jest.Mock<any, any, any>; set: jest.Mock<any, any, any>; del: jest.Mock<any, any, any>; }; id?: undefined; name?: undefined; })[]; }) {
    throw new Error('Function not implemented.');
  }

