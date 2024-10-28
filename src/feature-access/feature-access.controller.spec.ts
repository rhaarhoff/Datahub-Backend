// src/feature-access/feature-access.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessController } from './feature-access.controller';
import { FeatureAccessService } from './feature-access.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '@prisma-service/prisma.service';

describe('FeatureAccessController', () => {
  let controller: FeatureAccessController;
  let service: FeatureAccessService;

  const mockFeatureAccessService = {
    updateFeatureAccessForRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureAccessController],
      providers: [
        { provide: FeatureAccessService, useValue: mockFeatureAccessService },
        { provide: CacheService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<FeatureAccessController>(FeatureAccessController);
    service = module.get<FeatureAccessService>(FeatureAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateFeatureAccess', () => {
    it('should update feature access successfully', async () => {
      const tenantId = 101;
      mockFeatureAccessService.updateFeatureAccessForRoles.mockResolvedValueOnce(undefined);

      const result = await controller.updateFeatureAccess(tenantId);
      expect(result).toBe(`Feature access updated successfully for tenant ${tenantId}`);
      expect(service.updateFeatureAccessForRoles).toHaveBeenCalledWith(tenantId);
    });

    it('should throw an error if feature access update fails', async () => {
      const tenantId = 101;
      mockFeatureAccessService.updateFeatureAccessForRoles.mockRejectedValueOnce(new Error('Update Failed'));

      await expect(controller.updateFeatureAccess(tenantId)).rejects.toThrow('Update Failed');
    });
  });
});