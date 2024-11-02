import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessService } from './feature-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccessLevel, AuditAction } from '@prisma/client';
import { UpdateFeatureAccessDto } from './dto/update-feature-access.dto';
import retry from 'async-retry';

jest.mock('async-retry', () => jest.fn((fn) => fn()));

describe('FeatureAccessService', () => {
  let service: FeatureAccessService;
  let prisma: PrismaService;
  let cacheManager: CacheManagerService;
  let auditService: AuditService;

  const tenantId = 1;
  const userRoleId = 1;
  const featureId = 1;
  const userId = 1;
  const accessData: UpdateFeatureAccessDto = {
    accessLevel: AccessLevel.MANAGE,
    featureId: 0,
    tenantId: 0,
    userRoleId: 0,
  };
  const ipAddress = '127.0.0.1';
  const userAgent = 'Mozilla/5.0';

  const mockFeatureAccess = {
    id: 1,
    featureId,
    tenantId,
    userRoleId,
    accessLevel: AccessLevel.VIEW,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureAccessService,
        {
          provide: PrismaService,
          useValue: {
            featureAccess: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              upsert: jest.fn(),
            },
            tenant: { findUnique: jest.fn() },
            userRole: { findMany: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CacheManagerService,
          useValue: {
            invalidateFeatureCache: jest.fn(),
            clearCacheKey: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FeatureAccessService>(FeatureAccessService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheManager = module.get<CacheManagerService>(CacheManagerService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('Access Level Determination', () => {
    it('FTR-SER-01: should return AccessLevel.MANAGE for ADMIN role', () => {
      expect(service['determineAccessLevel']('ADMIN')).toBe(AccessLevel.MANAGE);
    });

    it('FTR-SER-02: should return AccessLevel.EDIT for MEMBER role', () => {
      expect(service['determineAccessLevel']('MEMBER')).toBe(AccessLevel.EDIT);
    });

    it('FTR-SER-03: should return AccessLevel.VIEW for GUEST role', () => {
      expect(service['determineAccessLevel']('GUEST')).toBe(AccessLevel.VIEW);
    });
  });

  describe('getFeatureAccess', () => {
    it('FTR-SER-04: should retrieve feature access and log action', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(mockFeatureAccess);
      const auditSpy = jest.spyOn(auditService, 'logAction');

      const result = await service.getFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent);

      expect(result).toEqual(mockFeatureAccess);
      expect(auditSpy).toHaveBeenCalledWith({
        action: AuditAction.ACCESS_FEATURE,
        userId,
        tenantId,
        featureId,
        before: null,
        after: mockFeatureAccess,
        ipAddress,
        userAgent,
      });
    });

    it('FTR-SER-05: should throw NotFoundException if feature access does not exist', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent)
      ).rejects.toThrow(NotFoundException);
    });

    it('FTR-SER-06: should log AuditAction.ACCESS_FEATURE on successful access retrieval', async () => {
      const featureAccess = {
        id: 1,
        featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.VIEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(featureAccess);
      const auditSpy = jest.spyOn(auditService, 'logAction');

      await service.getFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent);

      expect(auditSpy).toHaveBeenCalledWith({
        action: AuditAction.ACCESS_FEATURE,
        userId,
        tenantId,
        featureId,
        before: null,
        after: featureAccess,
        ipAddress,
        userAgent,
      });
    });

  });

  describe('updateFeatureAccess', () => {
    it('FTR-SER-07: should update feature access and log action', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(mockFeatureAccess);
      jest.spyOn(prisma.featureAccess, 'update').mockResolvedValue({ ...mockFeatureAccess, accessLevel: AccessLevel.MANAGE });
      const auditSpy = jest.spyOn(auditService, 'logAction');

      await service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, accessData, ipAddress, userAgent);

      expect(auditSpy).toHaveBeenCalledWith({
        action: AuditAction.UPDATE_FEATURE_ACCESS,
        userId,
        tenantId,
        featureId,
        before: mockFeatureAccess,
        after: expect.objectContaining({ accessLevel: AccessLevel.MANAGE }),
        ipAddress,
        userAgent,
        modifiedFields: ['accessLevel'],
      });
    });

    it('FTR-SER-08: should throw NotFoundException if attempting to update non-existent feature access', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(null); // Simulate non-existent feature access

      await expect(
        service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, accessData, ipAddress, userAgent)
      ).rejects.toThrow(NotFoundException); // Assert that NotFoundException is thrown
    });

    it('FTR-SER-09: should log AuditAction.UPDATE_FEATURE_ACCESS with before and after states on successful update', async () => {
      // Mock existing feature access (before state)
      const existingAccess = {
        id: 1,
        featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.VIEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Mock updated feature access (after state)
      const updatedAccess = {
        ...existingAccess,
        accessLevel: AccessLevel.MANAGE, // Change in access level to simulate update
        updatedAt: new Date(), // Updated timestamp
      };

      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(existingAccess); // Simulate existing access
      jest.spyOn(prisma.featureAccess, 'update').mockResolvedValue(updatedAccess); // Simulate update
      const auditSpy = jest.spyOn(auditService, 'logAction'); // Spy on audit service log

      // Execute updateFeatureAccess
      await service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, accessData, ipAddress, userAgent);

      // Verify that the logAction was called with before and after states
      expect(auditSpy).toHaveBeenCalledWith({
        action: AuditAction.UPDATE_FEATURE_ACCESS,
        userId,
        tenantId,
        featureId,
        before: existingAccess, // Previous state
        after: updatedAccess, // Updated state
        ipAddress,
        userAgent,
        modifiedFields: ['accessLevel'], // Track modified field
      });
    });

    it('FTR-SER-10: should throw BadRequestException on invalid update data', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(mockFeatureAccess);

      const invalidData = { accessLevel: null } as UpdateFeatureAccessDto;

      await expect(
        service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, invalidData, ipAddress, userAgent)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearFeatureAccess', () => {
    it('FTR-SER-11: should clear feature access and invalidate cache with retry', async () => {
      // Mocking findUnique to return a non-deleted feature access
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValueOnce(mockFeatureAccess);

      // Spying on cache invalidation and Prisma update methods
      const cacheSpy = jest.spyOn(cacheManager, 'invalidateFeatureCache');
      const updateSpy = jest.spyOn(prisma.featureAccess, 'update').mockResolvedValue(mockFeatureAccess);

      // Calling the service method
      await service.clearFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent);

      // Verifying cache invalidation and update operations
      expect(cacheSpy).toHaveBeenCalledWith(tenantId, featureId);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { FeatureAccessCompositeKey: { featureId, tenantId, userRoleId } },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('FTR-SER-12: should throw NotFoundException if feature access does not exist', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(null);

      await expect(
        service.clearFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retryCacheInvalidation', () => {
    it('FTR-SER-13: should retry cache invalidation upon failure', async () => {
      jest.spyOn(cacheManager, 'invalidateFeatureCache')
        .mockImplementationOnce(() => {
          throw new Error('Cache invalidation failed on first attempt');
        })
        .mockImplementationOnce(() => {
          throw new Error('Cache invalidation failed on second attempt');
        })
        .mockResolvedValueOnce(undefined); // Simulate success on the third attempt
    
      // Execute the retry cache invalidation function
      await service['retryCacheInvalidation'](tenantId, featureId);
    
      // Validate the number of attempts
      expect(cacheManager.invalidateFeatureCache).toHaveBeenCalledTimes(3);
      expect(cacheManager.invalidateFeatureCache).toHaveBeenCalledWith(tenantId, featureId);
    });
    
    
    

  });

});
