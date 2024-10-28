import { Test, TestingModule } from '@nestjs/testing';
import { FeatureService } from './feature.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import { AuditService } from '../audit/audit.service';
import { CreateFeatureInput } from '@feature-dto/create-feature.input';
import { UpdateFeatureInput } from '@feature-dto/update-feature.input';
import { AuditAction } from '@prisma/client';
import { FeatureNotFoundException } from '../common/exceptions/feature-not-found.exception';
import { InvalidFeatureTierException } from '../common/exceptions/invalid-feature-tier.exception';
import { NotFoundException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { CacheSetException } from '../common/exceptions/cache-set.exception';

describe('FeatureService', () => {
  let service: FeatureService;
  let prismaService: ReturnType<typeof mockDeep<PrismaService>>;
  let cacheManagerService: ReturnType<typeof mockDeep<CacheManagerService>>;
  let casbinHelperService: ReturnType<typeof mockDeep<CasbinHelperService>>;
  let auditService: ReturnType<typeof mockDeep<AuditService>>;

  const ipAddress = '127.0.0.1';
  const userAgent = 'jest';

  beforeEach(async () => {
    prismaService = mockDeep<PrismaService>();
    cacheManagerService = mockDeep<CacheManagerService>();
    casbinHelperService = mockDeep<CasbinHelperService>();
    auditService = mockDeep<AuditService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CacheManagerService, useValue: cacheManagerService },
        { provide: CasbinHelperService, useValue: casbinHelperService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
  });

  function createMockFeature(overrides = {}): any {
    return {
      id: 1,
      name: 'Test Feature',
      description: 'A test feature',
      isPremium: false,
      enabled: true,
      tierId: 1,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('should create a feature and set cache, log audit, and invalidate cache', async () => {
    const createFeatureInput: CreateFeatureInput = {
      name: 'Test Feature',
      description: 'A test feature',
      isPremium: false,
      enabled: true,
      tierId: 1,
    };
    const tenantId = 1;
    const userId = 1;
    const mockCreatedFeature = createMockFeature();

    // Mocking featureTier.findUnique to return a valid feature tier with all required properties
    prismaService.featureTier.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Pro',
      description: 'Pro tier',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaService.feature.create.mockResolvedValue(mockCreatedFeature);
    prismaService.$transaction.mockImplementationOnce((callback) =>
      callback(prismaService),
    );
    casbinHelperService.enforceAuthorization.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);
    cacheManagerService.set.mockResolvedValueOnce(undefined);
    cacheManagerService.invalidateFeatureCache.mockResolvedValueOnce(undefined);

    const result = await service.create(
      createFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(result).toEqual(mockCreatedFeature);
    expect(cacheManagerService.set).toHaveBeenCalledWith(
      `tenant_${tenantId}_feature_${mockCreatedFeature.id}`,
      mockCreatedFeature,
    );
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.CREATE_FEATURE,
      userId,
      tenantId,
      featureId: mockCreatedFeature.id,
      before: null,
      after: mockCreatedFeature,
      ipAddress,
      userAgent,
    });
  });

  it('should update a feature and set cache, log audit, and invalidate cache', async () => {
    const updateFeatureInput: UpdateFeatureInput = {
      name: 'Updated Feature',
      description: 'Updated description',
      tierId: 1,
      isPremium: true,
      enabled: true,
      id: 1,
    };
    const tenantId = 1;
    const userId = 1;
    const featureId = 1;

    const existingFeature = createMockFeature({
      name: 'Old Feature',
      description: 'Old description',
    });
    const updatedFeature = { ...existingFeature, ...updateFeatureInput };

    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeature);
    prismaService.feature.update.mockResolvedValueOnce(updatedFeature);
    casbinHelperService.enforceAuthorization.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);
    cacheManagerService.set.mockResolvedValueOnce(undefined);
    cacheManagerService.invalidateFeatureCache.mockResolvedValueOnce(undefined);

    const result = await service.update(
      featureId,
      updateFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(casbinHelperService.enforceAuthorization).toHaveBeenCalledWith(
      userId,
      '/features/update',
      'update',
      tenantId,
    );
    expect(prismaService.feature.findFirst).toHaveBeenCalledWith({
      where: {
        id: featureId,
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
      },
    });
    expect(prismaService.feature.update).toHaveBeenCalledWith({
      where: { id: featureId },
      data: updateFeatureInput,
    });
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.UPDATE_FEATURE,
      userId,
      tenantId,
      featureId,
      before: existingFeature,
      after: updatedFeature,
      ipAddress,
      userAgent,
      modifiedFields: ['name', 'description', 'isPremium'],
    });
    expect(cacheManagerService.set).toHaveBeenCalledWith(
      `tenant_${tenantId}_feature_${featureId}`,
      updatedFeature,
    );
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
      featureId,
    );
    expect(result).toEqual(updatedFeature);
  });

  it('should throw FeatureNotFoundException if feature not found', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureId = 1;

    prismaService.feature.findFirst.mockResolvedValueOnce(null);

    await expect(service.getFeatureById(featureId, tenantId)).rejects.toThrow(
      FeatureNotFoundException,
    );
  });

  it('should list all active features for a tenant', async () => {
    const tenantId = 1;
    const mockFeatures = [
      createMockFeature({ id: 1, name: 'Feature 1' }),
      createMockFeature({ id: 2, name: 'Feature 2' }),
    ];

    // Mocking Prisma to return active features
    prismaService.feature.findMany.mockResolvedValue(mockFeatures);

    const result = await service.findAll(tenantId, '0', 10, false);

    // Expect the result to match the mock data
    expect(result).toEqual(mockFeatures);
    expect(prismaService.feature.findMany).toHaveBeenCalledWith({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
        name: { contains: '0' },
        tierId: 10,
        isPremium: false,
      },
    });
  });

  it('should soft delete a feature and invalidate cache', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureId = 1;

    const existingFeature = createMockFeature();
    const deletedFeature = { ...existingFeature, deletedAt: new Date() };

    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeature);
    prismaService.feature.update.mockResolvedValueOnce(deletedFeature);
    cacheManagerService.invalidateFeatureCache.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);

    const result = await service.remove(
      featureId,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(prismaService.feature.update).toHaveBeenCalledWith({
      where: { id: featureId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
      featureId,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.SOFT_DELETE_FEATURE,
      userId,
      tenantId,
      featureId,
      before: existingFeature,
      after: deletedFeature,
      ipAddress,
      userAgent,
    });
    expect(result).toEqual(deletedFeature);
  });

  it('should handle invalid tier exception during feature creation', async () => {
    const createFeatureInput: CreateFeatureInput = {
      name: 'Invalid Tier Feature',
      description: 'A test feature with an invalid tier',
      isPremium: false,
      enabled: true,
      tierId: 999, // Invalid tier ID
    };
    const tenantId = 1;
    const userId = 1;

    prismaService.featureTier.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(
        createFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      ),
    ).rejects.toThrow(InvalidFeatureTierException);
  });

  it('should soft delete a feature and invalidate cache', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureId = 1;

    const existingFeature = createMockFeature();
    const softDeletedFeature = { ...existingFeature, deletedAt: new Date() };

    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeature);
    prismaService.feature.update.mockResolvedValueOnce(softDeletedFeature);
    cacheManagerService.invalidateFeatureCache.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);

    const result = await service.remove(
      featureId,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(prismaService.feature.update).toHaveBeenCalledWith({
      where: { id: featureId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
      featureId,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.SOFT_DELETE_FEATURE,
      userId,
      tenantId,
      featureId,
      before: existingFeature,
      after: softDeletedFeature,
      ipAddress,
      userAgent,
    });
    expect(result).toEqual(softDeletedFeature);
  });

  it('should list all soft-deleted features (recycle bin)', async () => {
    const tenantId = 1;
    const mockFeatures = [
      createMockFeature({ deletedAt: new Date() }),
      createMockFeature({
        id: 2,
        name: 'Another Feature',
        deletedAt: new Date(),
      }),
    ];

    prismaService.feature.findMany.mockResolvedValueOnce(mockFeatures);

    const result = await service.findAllDeleted(tenantId);

    expect(prismaService.feature.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: { not: null },
      },
    });
    expect(result).toEqual(mockFeatures);
  });

  it('should restore a soft-deleted feature', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureId = 1;

    const softDeletedFeature = createMockFeature({ deletedAt: new Date() });
    const restoredFeature = { ...softDeletedFeature, deletedAt: null };

    prismaService.feature.findFirst.mockResolvedValueOnce(softDeletedFeature);
    prismaService.feature.update.mockResolvedValueOnce(restoredFeature);
    cacheManagerService.set.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);

    const result = await service.restore(
      featureId,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(prismaService.feature.update).toHaveBeenCalledWith({
      where: { id: featureId },
      data: { deletedAt: null },
    });
    expect(cacheManagerService.set).toHaveBeenCalledWith(
      `tenant_${tenantId}_feature_${featureId}`,
      restoredFeature,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.RESTORE_FEATURE,
      userId,
      tenantId,
      featureId,
      before: softDeletedFeature,
      after: restoredFeature,
      ipAddress,
      userAgent,
    });
    expect(result).toEqual(restoredFeature);
  });

  it('should throw NotFoundException if trying to restore a feature not in the recycle bin', async () => {
    const tenantId = 1;
    const featureId = 1;
    const userId = 1;

    prismaService.feature.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.restore(featureId, tenantId, userId, ipAddress, userAgent),
    ).rejects.toThrow(NotFoundException);
  });

  it('should permanently delete a feature', async () => {
    const tenantId = 1;
    const featureId = 1;
    const userId = 123; // Mock user ID
    const ipAddress = '127.0.0.1'; // Mock IP address
    const userAgent = 'TestAgent'; // Mock user agent

    const existingFeature = createMockFeature();

    // Mock the responses for feature find and delete operations
    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeature);
    prismaService.feature.delete.mockResolvedValueOnce(undefined);
    cacheManagerService.invalidateFeatureCache.mockResolvedValueOnce(undefined);

    // Call the hardRemove method with the required arguments
    await service.hardRemove(featureId, tenantId, userId, ipAddress, userAgent);

    // Assert that the Prisma delete method was called with the correct parameters
    expect(prismaService.feature.delete).toHaveBeenCalledWith({
      where: { id: featureId },
    });

    // Assert that the cache invalidation method was called with the correct parameters
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
      featureId,
    );
  });

  it('should throw CacheSetException when failing to set cache after creating a feature', async () => {
    const createFeatureInput: CreateFeatureInput = {
      name: 'Test Feature',
      description: 'A test feature',
      isPremium: false,
      enabled: true,
      tierId: 1,
    };
    const tenantId = 1;
    const userId = 1;
    const mockCreatedFeature = createMockFeature();

    prismaService.featureTier.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Pro',
      description: 'Pro tier',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaService.feature.create.mockResolvedValue(mockCreatedFeature);
    prismaService.$transaction.mockImplementationOnce((callback) =>
      callback(prismaService),
    );
    casbinHelperService.enforceAuthorization.mockResolvedValueOnce(undefined);
    auditService.logAction.mockResolvedValueOnce(undefined);
    cacheManagerService.set.mockRejectedValueOnce(new Error('Cache error'));

    await expect(
      service.create(
        createFeatureInput,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      ),
    ).rejects.toThrow(CacheSetException);

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(cacheManagerService.set).toHaveBeenCalled();
  });

  it('should bulk soft delete features and invalidate cache', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureIds = [1, 2];

    const existingFeatures = featureIds.map((id) => createMockFeature({ id }));
    const softDeletedFeatures = existingFeatures.map((f) => ({
      ...f,
      deletedAt: new Date(),
    }));

    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeatures[0]);
    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeatures[1]);
    prismaService.feature.update.mockResolvedValueOnce(softDeletedFeatures[0]);
    prismaService.feature.update.mockResolvedValueOnce(softDeletedFeatures[1]);
    cacheManagerService.invalidateFeatureCache.mockResolvedValue(undefined);
    auditService.logAction.mockResolvedValue(undefined);

    const result = await service.bulkRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(result).toEqual({
      errors: [],
      success: softDeletedFeatures.map((feature) => ({
        status: 'fulfilled',
        value: feature,
      })),
    });
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledTimes(2);
    expect(auditService.logAction).toHaveBeenCalledTimes(2);
  });

  it('should bulk restore features and set cache', async () => {
    const tenantId = 1;
    const userId = 1;
    const featureIds = [1, 2];

    const softDeletedFeatures = featureIds.map((id) =>
      createMockFeature({ id, deletedAt: new Date() }),
    );
    const restoredFeatures = softDeletedFeatures.map((f) => ({
      ...f,
      deletedAt: null,
    }));

    prismaService.feature.findFirst.mockResolvedValueOnce(
      softDeletedFeatures[0],
    );
    prismaService.feature.findFirst.mockResolvedValueOnce(
      softDeletedFeatures[1],
    );
    prismaService.feature.update.mockResolvedValueOnce(restoredFeatures[0]);
    prismaService.feature.update.mockResolvedValueOnce(restoredFeatures[1]);
    cacheManagerService.set.mockResolvedValue(undefined);
    auditService.logAction.mockResolvedValue(undefined);

    const result = await service.bulkRestore(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    expect(result).toEqual(restoredFeatures);
    expect(cacheManagerService.set).toHaveBeenCalledTimes(2);
    expect(auditService.logAction).toHaveBeenCalledTimes(2);
  });

  it('should bulk hard delete features and invalidate cache', async () => {
    const tenantId = 1;
    const featureIds = [1, 2];
    const userId = 123; // Mock user ID
    const ipAddress = '127.0.0.1'; // Mock IP address
    const userAgent = 'TestAgent'; // Mock user agent

    const existingFeatures = featureIds.map((id) => createMockFeature({ id }));

    // Mock the findFirst method to return the correct features in sequence
    prismaService.feature.findFirst
      .mockResolvedValueOnce(existingFeatures[0])
      .mockResolvedValueOnce(existingFeatures[1]);

    // Mock the delete method for each feature
    prismaService.feature.delete
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    // Mock cache invalidation for each feature
    cacheManagerService.invalidateFeatureCache.mockResolvedValue(undefined);

    // Call the service method
    const result = await service.bulkHardRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    // Expectations
    expect(result).toEqual([undefined, undefined]);
    expect(prismaService.feature.delete).toHaveBeenCalledTimes(2);
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledTimes(2);
    expect(prismaService.feature.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should toggle feature status and invalidate cache', async () => {
    const tenantId = 1;
    const featureId = 1;

    const existingFeature = createMockFeature({ enabled: true });
    const updatedFeature = { ...existingFeature, enabled: false };

    prismaService.feature.findFirst.mockResolvedValueOnce(existingFeature);
    prismaService.feature.update.mockResolvedValueOnce(updatedFeature);
    cacheManagerService.invalidateFeatureCache.mockResolvedValue(undefined);

    const result = await service.toggleFeatureStatus(featureId, tenantId);

    expect(result).toEqual(updatedFeature);
    expect(prismaService.feature.update).toHaveBeenCalledWith({
      where: { id: featureId },
      data: { enabled: false },
    });
    expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
      tenantId,
      featureId,
    );
  });

  it('should list all active features for a tenant', async () => {
    const tenantId = 1;
    const mockFeatures = [
      createMockFeature({ id: 1, name: 'Feature 1' }),
      createMockFeature({ id: 2, name: 'Feature 2' }),
    ];
  
    // Mocking Prisma to return active features
    prismaService.feature.findMany.mockResolvedValue(mockFeatures);
  
    const result = await service.findAll(tenantId, '0', 10, false);
  
    // Expect the result to match the mock data
    expect(result).toEqual(mockFeatures);
    expect(prismaService.feature.findMany).toHaveBeenCalledWith({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
        isPremium: false,
        name: { contains: '0' },
        tierId: 10,
      },
    });
  });

  it('should return an empty array if no active features exist for the tenant', async () => {
    const tenantId = 1;

    // Mocking Prisma to return an empty array
    prismaService.feature.findMany.mockResolvedValue([]);

    const result = await service.findAll(tenantId, '0', 10, false);

    // Expect the result to be an empty array
    expect(result).toEqual([]);
    expect(prismaService.feature.findMany).toHaveBeenCalledWith({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
        name: { contains: '0' },
        tierId: 10,
        isPremium: false,
      },
    });
  });

  describe('FeatureService - bulkCreate', () => {
    let service: FeatureService;
    let prismaService: PrismaService;
    let cacheManagerService: CacheManagerService;
    let auditService: AuditService;
    let casbinHelperService: CasbinHelperService; // Add CasbinHelperService

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          FeatureService,
          {
            provide: PrismaService,
            useValue: {
              feature: {
                create: jest.fn(),
                findFirst: jest.fn(),
              },
              featureTier: {
                findUnique: jest.fn(),
              },
              $transaction: jest.fn((fn) => fn(prismaService)),
            },
          },
          {
            provide: CacheManagerService,
            useValue: {
              set: jest.fn(),
              invalidateFeatureCache: jest.fn(),
            },
          },
          {
            provide: AuditService,
            useValue: {
              logAction: jest.fn(),
            },
          },
          {
            provide: CasbinHelperService, // Add the CasbinHelperService mock
            useValue: {
              enforceAuthorization: jest.fn(), // Mock methods as needed
            },
          },
        ],
      }).compile();

      service = moduleRef.get<FeatureService>(FeatureService);
      prismaService = moduleRef.get<PrismaService>(PrismaService);
      cacheManagerService =
        moduleRef.get<CacheManagerService>(CacheManagerService);
      auditService = moduleRef.get<AuditService>(AuditService);
      // casbinHelperService is already initialized in the beforeEach block
    });

    it('should bulk create features, set cache, log audit, and invalidate cache', async () => {
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const createFeatureInputs: CreateFeatureInput[] = [
        {
          name: 'Feature 1',
          description: 'Desc 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Desc 2',
          isPremium: true,
          enabled: true,
          tierId: 2,
        },
      ];

      const mockFeatures = createFeatureInputs.map((input, index) => ({
        id: index + 1, // Ensure that the id is set
        name: input.name,
        description: input.description,
        isPremium: input.isPremium,
        enabled: input.enabled,
        deletedAt: null,
      }));

      // Mock the behavior of validateFeatureTier to handle different tier IDs
      prismaService.featureTier.findUnique = jest
        .fn()
        .mockImplementation((params) => {
          if (params.where.id === 1) {
            return Promise.resolve({ id: 1 });
          } else if (params.where.id === 2) {
            return Promise.resolve({ id: 2 });
          } else {
            return Promise.resolve(null); // Fallback for invalid tiers
          }
        });

      // Mock the feature creation
      (prismaService.feature.create as jest.Mock)
        .mockResolvedValueOnce(mockFeatures[0])
        .mockResolvedValueOnce(mockFeatures[1]);

      const result = await service.bulkCreate(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      // Assertions
      expect(result).toEqual(mockFeatures);
      expect(prismaService.feature.create).toHaveBeenCalledTimes(2);
      expect(cacheManagerService.set).toHaveBeenCalledTimes(2);
      expect(auditService.logAction).toHaveBeenCalledTimes(2);
      expect(cacheManagerService.invalidateFeatureCache).toHaveBeenCalledWith(
        tenantId,
      );
    });

    it('should validate tiers before creating features', async () => {
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const createFeatureInputs: CreateFeatureInput[] = [
        {
          name: 'Feature 1',
          description: 'Desc 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Desc 2',
          isPremium: true,
          enabled: true,
          tierId: 2,
        },
      ];

      // Spy on validateFeatureTier to track its invocation
      const validateFeatureTierSpy = jest
        .spyOn(service, 'validateFeatureTier')
        .mockResolvedValue(undefined); // Simulate validation

      // Mock the feature creation to avoid errors during bulk creation
      prismaService.feature.create = jest.fn().mockResolvedValue({
        id: 1,
        ...createFeatureInputs[0],
      });

      // Call the service method
      await service.bulkCreate(
        createFeatureInputs,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      );

      // Ensure that validateFeatureTier is called twice, once for each feature
      expect(validateFeatureTierSpy).toHaveBeenCalledTimes(2);
      expect(validateFeatureTierSpy).toHaveBeenCalledWith(1); // For tierId: 1
      expect(validateFeatureTierSpy).toHaveBeenCalledWith(2); // For tierId: 2
    });

    it('should throw an error if feature tier is invalid', async () => {
      const tenantId = 1;
      const userId = 1;
      const ipAddress = '127.0.0.1';
      const userAgent = 'test-agent';

      const createFeatureInputs: CreateFeatureInput[] = [
        {
          name: 'Feature 1',
          description: 'Desc 1',
          isPremium: false,
          enabled: true,
          tierId: 1,
        },
        {
          name: 'Feature 2',
          description: 'Desc 2',
          isPremium: true,
          enabled: true,
          tierId: 2,
        },
      ];

      // Mock validateFeatureTier to throw an error
      jest
        .spyOn(service, 'validateFeatureTier')
        .mockRejectedValue(new InvalidFeatureTierException(1));

      await expect(
        service.bulkCreate(
          createFeatureInputs,
          tenantId,
          userId,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(InvalidFeatureTierException);

      // Ensure that no features were created
      expect(prismaService.feature.create).not.toHaveBeenCalled();
      expect(cacheManagerService.set).not.toHaveBeenCalled();
    });
  });
});
