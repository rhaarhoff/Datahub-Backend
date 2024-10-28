import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessService } from './feature-access.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { CacheService } from '../cache/cache.service';

// src/feature-access/feature-access.service.spec.ts

describe('FeatureAccessService', () => {
  let service: FeatureAccessService;
  let mockPrismaService;
  let mockCacheService;

  beforeEach(async () => {
    mockPrismaService = {
      userRole: {
        findMany: jest.fn(),
      },
      tenantFeature: {
        findMany: jest.fn(),
      },
      featureAccess: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    mockCacheService = {
      clear: jest.fn(),
      generateCacheKey: jest.fn().mockReturnValue('mock-cache-key'),
      set: jest.fn(),
      getTTLForFeature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureAccessService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<FeatureAccessService>(FeatureAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateFeatureAccessForRoles', () => {
    it('should update feature access for tenant roles', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([{ id: 1, role: { name: 'ADMIN' } }]);
      mockPrismaService.tenantFeature.findMany.mockResolvedValue([{ featureId: 1, feature: { name: 'Manage Users' } }]);

      await service.updateFeatureAccessForRoles(101);

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalled();
      expect(mockPrismaService.tenantFeature.findMany).toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.createMany).toHaveBeenCalled();
    });

    it('should handle case when no roles are found', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([]);
      
      await service.updateFeatureAccessForRoles(101);

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalled();
      expect(mockCacheService.clear).toHaveBeenCalledWith('mock-cache-key');
      expect(mockPrismaService.tenantFeature.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.createMany).not.toHaveBeenCalled();
    });

    it('should handle case when no features are found', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([{ id: 1, role: { name: 'ADMIN' } }]);
      mockPrismaService.tenantFeature.findMany.mockResolvedValue([]);

      await service.updateFeatureAccessForRoles(101);

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalled();
      expect(mockPrismaService.tenantFeature.findMany).toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaService.featureAccess.createMany).not.toHaveBeenCalled();
    });

    it('should throw an error if userRole findMany fails', async () => {
      mockPrismaService.userRole.findMany.mockRejectedValueOnce(new Error('Find failed'));

      await expect(service.updateFeatureAccessForRoles(101)).rejects.toThrow('Find failed');
    });

    it('should throw an error if tenantFeature findMany fails', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([{ id: 1, role: { name: 'ADMIN' } }]);
      mockPrismaService.tenantFeature.findMany.mockRejectedValueOnce(new Error('Find failed'));

      await expect(service.updateFeatureAccessForRoles(101)).rejects.toThrow('Find failed');
    });
  });
});

