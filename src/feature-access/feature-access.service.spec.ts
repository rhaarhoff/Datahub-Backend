import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessService } from './feature-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccessLevel, AuditAction, FeatureAccess, Tenant, UserRole } from '@prisma/client';
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

  describe('getFeatureAccess', () => {
    it('should retrieve feature access and log action', async () => {
      const featureAccess: ExtendedFeatureAccess = {
        id: 1,
        featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.VIEW,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(featureAccess);
      const auditSpy = jest.spyOn(auditService, 'logAction');

      const result = await service.getFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent);

      expect(result).toEqual(featureAccess);
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

    it('should throw NotFoundException if feature access does not exist', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFeatureAccess', () => {
    it('should update feature access and log action', async () => {
      const existingAccess: ExtendedFeatureAccess = {
        id: 1,
        featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.VIEW,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(existingAccess);
      jest.spyOn(prisma.featureAccess, 'update').mockResolvedValue({ ...existingAccess, accessLevel: AccessLevel.MANAGE });
      const auditSpy = jest.spyOn(auditService, 'logAction');

      await service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, accessData, ipAddress, userAgent);

      expect(auditSpy).toHaveBeenCalledWith({
        action: AuditAction.UPDATE_FEATURE_ACCESS,
        userId,
        tenantId,
        featureId,
        before: existingAccess,
        after: expect.objectContaining({ accessLevel: AccessLevel.MANAGE }),
        ipAddress,
        userAgent,
        modifiedFields: ['accessLevel'],
      });
    });

    it('should throw BadRequestException on invalid update data', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue({
        id: 1,
        featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.VIEW,
        deletedAt: null,
      } as FeatureAccess);

      const invalidData = { accessLevel: null } as UpdateFeatureAccessDto;

      await expect(
        service.updateFeatureAccess(featureId, tenantId, userRoleId, userId, invalidData, ipAddress, userAgent)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearFeatureAccess', () => {
    it('should clear feature access and invalidate cache with retry', async () => {
      const cacheSpy = jest.spyOn(cacheManager, 'invalidateFeatureCache');
      const existingAccess = { id: 1, featureId, tenantId, userRoleId, accessLevel: AccessLevel.VIEW, deletedAt: null };
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(existingAccess);

      await service.clearFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent);

      expect(cacheSpy).toHaveBeenCalledWith(tenantId, featureId);
      expect(prisma.featureAccess.updateMany).toHaveBeenCalledWith({
        where: { featureId, tenantId, userRoleId, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if feature access does not exist', async () => {
      jest.spyOn(prisma.featureAccess, 'findUnique').mockResolvedValue(null);

      await expect(
        service.clearFeatureAccess(featureId, tenantId, userRoleId, userId, ipAddress, userAgent)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFeatureAccessForRoles', () => {
    it('should update feature access for all roles of tenant', async () => {
      const tenant: Tenant = {
        id: tenantId,
        name: "Example Tenant",
        subscriptionPlanId: 1,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(),
        status: "ACTIVE",
        complianceLevel: "STANDARD",
        currentUsage: 0,
        usageQuota: 100,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        domain: "example.com",
      };

      const userRoles: (UserRole & { role: { name: string } })[] = [
        {
          id: userRoleId,
          tenantId,
          deletedAt: null,
          userId,
          roleId: 1,
          isPrimaryRole: true,
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          role: { name: "ADMIN" },
        },
      ];

      jest.spyOn(prisma.tenant, 'findUnique').mockResolvedValue(tenant);
      jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue(userRoles);
      jest.spyOn(prisma.featureAccess, 'upsert').mockResolvedValue({
        id: 1,
        featureId: featureId,
        tenantId,
        userRoleId,
        accessLevel: AccessLevel.MANAGE,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FeatureAccess);

      await service.updateFeatureAccessForRoles(tenantId);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
        include: { subscriptionPlan: { include: { features: true } } },
      });
      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: { tenantId, deletedAt: null },
        include: { role: true },
      });
    });
  });

  describe('clearFeatureAccessForTenant', () => {
    it('should clear all feature access for tenant and invalidate cache with retry', async () => {
      const deletionTime = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => deletionTime);

      await service.clearFeatureAccessForTenant(tenantId);

      expect(retry).toHaveBeenCalled();
      expect(prisma.featureAccess.updateMany).toHaveBeenCalledWith({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: deletionTime },
      });
      expect(cacheManager.invalidateFeatureCache).toHaveBeenCalledWith(tenantId);
    });
  });
});
