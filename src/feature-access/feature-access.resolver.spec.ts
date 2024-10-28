// src/feature-access/feature-access.resolver.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessResolver } from './feature-access.resolver';
import { FeatureAccessService } from './feature-access.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '@prisma-service/prisma.service';

describe('FeatureAccessResolver', () => {
  let resolver: FeatureAccessResolver;
  let service: FeatureAccessService;

  const mockFeatureAccessService = {
    updateFeatureAccessForRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureAccessResolver,
        { provide: FeatureAccessService, useValue: mockFeatureAccessService },
        { provide: CacheService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    resolver = module.get<FeatureAccessResolver>(FeatureAccessResolver);
    service = module.get<FeatureAccessService>(FeatureAccessService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateFeatureAccess', () => {
    it('should update feature access successfully', async () => {
      const tenantId = '101';
      mockFeatureAccessService.updateFeatureAccessForRoles.mockResolvedValueOnce(undefined);

      const result = await resolver.updateFeatureAccess(tenantId);
      expect(result).toBe(`Feature access updated successfully for tenant ${tenantId}`);
      expect(service.updateFeatureAccessForRoles).toHaveBeenCalledWith(parseInt(tenantId, 10));
    });

    it('should throw an error if feature access update fails', async () => {
      const tenantId = '101';
      mockFeatureAccessService.updateFeatureAccessForRoles.mockRejectedValueOnce(new Error('Update Failed'));

      await expect(resolver.updateFeatureAccess(tenantId)).rejects.toThrow('Update Failed');
    });
  });
});