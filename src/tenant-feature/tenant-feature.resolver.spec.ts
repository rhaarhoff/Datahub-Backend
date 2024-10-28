import { Test, TestingModule } from '@nestjs/testing';
import { TenantFeatureResolver } from './tenant-feature.resolver';
import { TenantFeatureService } from './tenant-feature.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { CacheService } from '../cache/cache.service';

describe('TenantFeatureResolver', () => {
  let resolver: TenantFeatureResolver;
  let service: TenantFeatureService;

  const mockTenantFeatureService = {
    updateTenantFeatures: jest.fn(),
    getTenantFeatures: jest.fn(),
  };

  const mockPrismaService = {};
  const mockCacheService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantFeatureResolver,
        {
          provide: TenantFeatureService,
          useValue: mockTenantFeatureService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    resolver = module.get<TenantFeatureResolver>(TenantFeatureResolver);
    service = module.get<TenantFeatureService>(TenantFeatureService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateTenantFeatures', () => {
    it('should update tenant features successfully', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const updateTenantFeaturesInput = {
        tenantId: tenantIdNumber,
        featureId: 1,
        enabled: true,
        newPlanId: 1,
      };
      const resultMessage = `Tenant features updated for tenant ${tenantId} with plan ${updateTenantFeaturesInput.newPlanId}`;

      jest.spyOn(service, 'updateTenantFeatures').mockResolvedValueOnce(resultMessage);

      const result = await resolver.updateTenantFeatures(tenantId, updateTenantFeaturesInput);
      expect(result).toBe(resultMessage);
      expect(service.updateTenantFeatures).toHaveBeenCalledWith(
        tenantIdNumber,
        updateTenantFeaturesInput.newPlanId,
      );
    });

    it('should throw an error if tenant features update fails', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const updateTenantFeaturesInput = {
        tenantId: tenantIdNumber,
        featureId: 1,
        enabled: true,
        newPlanId: 1,
      };

      jest.spyOn(service, 'updateTenantFeatures').mockRejectedValueOnce(new Error('Update Failed'));

      await expect(
        resolver.updateTenantFeatures(tenantId, updateTenantFeaturesInput),
      ).rejects.toThrow('Update Failed');
    });
  });

  describe('getTenantFeatures', () => {
    it('should return tenant features successfully', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);
      const tenantFeatures = [
        { tenantId: tenantIdNumber, featureId: 1, enabled: true },
        { tenantId: tenantIdNumber, featureId: 2, enabled: true },
      ];

      jest.spyOn(service, 'getTenantFeatures').mockResolvedValueOnce(tenantFeatures);

      const result = await resolver.getTenantFeatures(tenantId);
      expect(result).toBe(tenantFeatures);
      expect(service.getTenantFeatures).toHaveBeenCalledWith(tenantIdNumber);
    });

    it('should throw an error if tenant features retrieval fails', async () => {
      const tenantId = '101';
      const tenantIdNumber = parseInt(tenantId, 10);

      jest.spyOn(service, 'getTenantFeatures').mockRejectedValueOnce(new Error('Retrieval Failed'));

      await expect(resolver.getTenantFeatures(tenantId)).rejects.toThrow('Retrieval Failed');
    });
  });
});
