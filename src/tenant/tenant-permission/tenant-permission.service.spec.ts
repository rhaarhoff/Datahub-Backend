import { Test, TestingModule } from '@nestjs/testing';
import { TenantPermissionService } from './tenant-permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../cache/cache.service';
import { CreateTenantPermissionDto } from './dto/create-tenant-permission.dto';
import { UpdateTenantPermissionDto } from './dto/update-tenant-permission.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, Tenant, TenantPermission } from '@prisma/client';

jest.mock('async-retry', () => ({
  __esModule: true,
  default: jest.fn(async (fn: () => Promise<any>, options: any) => {
    const retries = options?.retries ?? 2;
    let attempts = 0;

    while (attempts <= retries) {
      try {
        attempts++;
        console.log(`Attempt ${attempts}`);
        return await fn();
      } catch (err) {
        console.log(`Attempt ${attempts} failed with error:`, err);
        // Do not retry on client errors
        if (err instanceof BadRequestException || err instanceof NotFoundException) {
          throw err;
        }
        if (attempts > retries) {
          throw err instanceof Error ? err : new Error(String(err));
        }
        // Optionally, add a delay here if needed
      }
    }
  }),
}));

describe('TenantPermissionService', () => {
  let service: TenantPermissionService;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantPermissionService,
        {
          provide: PrismaService,
          useValue: {
            tenantPermission: {
              create: jest.fn().mockResolvedValue({
                id: 1,
                name: 'VIEW_PROJECTS',
                tenantId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 1,
                  name: 'VIEW_PROJECTS',
                  tenantId: 1,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
              findUnique: jest.fn().mockResolvedValue({
                id: 1,
                name: 'VIEW_PROJECTS',
                tenantId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
              update: jest.fn().mockResolvedValue({
                id: 1,
                name: 'UPDATED_PROJECTS',
                tenantId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
              deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          },
        },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            clear: jest.fn(),
            generateCacheKey: jest.fn((...args: string[]) => args.join(':')),
          },
        },
      ],
    }).compile();

    service = module.get<TenantPermissionService>(TenantPermissionService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('createTenantPermission', () => {
    it('should create a tenant permission and log the action', async () => {
      const createDto: CreateTenantPermissionDto = {
        name: 'VIEW_PROJECTS',
        tenantId: 1,
        description: 'Allows viewing projects',
      };
      const createdPermission = { id: 1, ...createDto, createdAt: new Date(), updatedAt: new Date() };
      (prismaService.tenantPermission.create as jest.Mock).mockResolvedValue(createdPermission);

      const result = await service.createTenantPermission(createDto, 1, 1);

      expect(result).toEqual(createdPermission);
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_TENANT_PERMISSION' }));
      expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), createdPermission);
    });

    it('should handle unique constraint violations with meaningful messages', async () => {
      const createDto: CreateTenantPermissionDto = { name: 'VIEW_PROJECTS', tenantId: 1, description: 'Allows viewing projects' };
      (prismaService.tenantPermission.create as jest.Mock).mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        { code: 'P2002', clientVersion: '2.0.0' }
      ));

      await expect(service.createTenantPermission(createDto, 1, 1)).rejects.toThrow('Unique constraint violation');
    });

    it('should prevent simultaneous create with the same data due to unique constraint', async () => {
      const createDto: CreateTenantPermissionDto = {
        name: 'VIEW_PROJECTS',
        tenantId: 1,
        description: 'Allows viewing projects',
      };

      const createdPermission = { id: 1, ...createDto, createdAt: new Date(), updatedAt: new Date() };

      (prismaService.tenantPermission.create as jest.Mock)
        .mockResolvedValueOnce(createdPermission)
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
            code: 'P2002',
            clientVersion: '2.0.0',
          }),
        );

      const createPromises = [
        service.createTenantPermission(createDto, 1, 1),
        service.createTenantPermission(createDto, 1, 1),
      ];

      const results = await Promise.allSettled(createPromises);

      console.log('Rejected reason:', (results[1] as PromiseRejectedResult).reason);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
      expect((results[1] as PromiseRejectedResult).reason.status).toBe(400);
      expect((results[1] as PromiseRejectedResult).reason.message).toContain('Unique constraint violation');
    });


    it('should handle missing required fields with meaningful error', async () => {
      const createDto: Partial<CreateTenantPermissionDto> = { name: 'VIEW_PROJECTS' }; // Missing tenantId and description

      // Mock Prisma create function to simulate validation error
      (prismaService.tenantPermission.create as jest.Mock).mockRejectedValue(new Prisma.PrismaClientValidationError('Missing required fields', { clientVersion: '2.0.0' }));

      await expect(service.createTenantPermission(createDto as CreateTenantPermissionDto, 1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.createTenantPermission(createDto as CreateTenantPermissionDto, 1, 1)).rejects.toThrow('Missing required fields');
    });

    it('should throw NotFoundException when creating permission for a non-existent tenant', async () => {
      const createDto: CreateTenantPermissionDto = {
        name: 'VIEW_PROJECTS',
        tenantId: 9999,
        description: 'Allows viewing projects',
      };

      (prismaService.tenantPermission.create as jest.Mock).mockRejectedValue(new NotFoundException('Tenant not found'));

      await expect(service.createTenantPermission(createDto, 1, 9999)).rejects.toThrow(NotFoundException);
      await expect(service.createTenantPermission(createDto, 1, 9999)).rejects.toThrow('Tenant not found');
    });

    it('should verify audit log for create action', async () => {
      const createDto: CreateTenantPermissionDto = {
        name: 'VIEW_PROJECTS',
        tenantId: 1,
        description: 'Allows viewing projects',
      };
      const createdPermission = { id: 1, ...createDto, createdAt: new Date(), updatedAt: new Date() };
      (prismaService.tenantPermission.create as jest.Mock).mockResolvedValue(createdPermission);

      await service.createTenantPermission(createDto, 1, 1);

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_TENANT_PERMISSION',
          userId: 1,
          tenantId: 1,
          after: createdPermission,
        })
      );
    });
  });

  describe('getPermissionsForTenant', () => {
    it('should fetch permissions and log access', async () => {
      const permissions = [{ id: 1, name: 'VIEW_PROJECTS', tenantId: 1, description: 'Allows viewing projects', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }];
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValue(permissions);

      const result = await service.getPermissionsForTenant(1, 1);

      expect(result).toEqual(permissions);
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'ACCESS_TENANT_PERMISSION' }));
    });

    it('should throw NotFoundException if no permissions are found', async () => {
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.getPermissionsForTenant(9999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should verify audit log for read action', async () => {
      const permissions = [{ id: 1, name: 'VIEW_PROJECTS', tenantId: 1 }];
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValue(permissions);

      await service.getPermissionsForTenant(1, 1);

      // Verify that an audit log entry was created with the ACCESS_TENANT_PERMISSION action
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'ACCESS_TENANT_PERMISSION',
        userId: 1,
        tenantId: 1,
        before: null, // There is no "before" data for a read action
        after: permissions, // The "after" state should match the permissions fetched
      });
    });

  });

  describe('updateTenantPermission', () => {
    it('should update a permission and log the action', async () => {
      const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_VIEW_PROJECTS' };
      const existingPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1 };
      const updatedPermission = { ...existingPermission, ...updateDto };

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(existingPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockResolvedValue(updatedPermission);

      const result = await service.updateTenantPermission(1, updateDto, 1, 1);

      expect(result).toEqual(updatedPermission);
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE_TENANT_PERMISSION' }));
      expect(cacheService.clear).toHaveBeenCalled();
    });

    it('should throw BadRequestException when provided invalid data', async () => {
      const updateDto: UpdateTenantPermissionDto = { name: '' }; // Invalid data
      const existingPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1 };

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(existingPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientValidationError('Invalid data', { clientVersion: '2.0.0' }),
      );

      await expect(service.updateTenantPermission(1, updateDto, 1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent updates without data corruption', async () => {
      const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_CONCURRENT' };
      const existingPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1 };
      const updatedPermission = { ...existingPermission, ...updateDto };

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(existingPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockResolvedValue(updatedPermission);

      // Run two concurrent updates
      const [result1, result2] = await Promise.all([
        service.updateTenantPermission(1, updateDto, 1, 1),
        service.updateTenantPermission(1, updateDto, 1, 1),
      ]);

      expect(result1).toEqual(updatedPermission);
      expect(result2).toEqual(updatedPermission);
      expect(auditService.logAction).toHaveBeenCalledTimes(2);
      expect(cacheService.clear).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if permission does not exist', async () => {
      const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_VIEW_PROJECTS' };

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(null); // Simulate non-existent permission

      await expect(service.updateTenantPermission(9999, updateDto, 1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTenantPermission', () => {
    it('should soft delete a permission and log the action', async () => {
      const existingPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1, deletedAt: null };
      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(existingPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockResolvedValue({ ...existingPermission, deletedAt: new Date() });

      await service.deleteTenantPermission(1, 1, 1);

      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE_TENANT_PERMISSION' }));
      expect(cacheService.clear).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission does not exist', async () => {
      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteTenantPermission(9999, 1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should retrieve all soft deleted permissions (Recycle Bin) for the tenant', async () => {
      const softDeletedPermissions = [
        { id: 2, name: 'EDIT_PROJECTS', tenantId: 1, deletedAt: new Date() },
        { id: 3, name: 'DELETE_PROJECTS', tenantId: 1, deletedAt: new Date() },
      ];
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValue(softDeletedPermissions);

      const result = await service.getDeletedPermissionsForTenant(1);

      expect(result).toEqual(softDeletedPermissions);
      expect(prismaService.tenantPermission.findMany).toHaveBeenCalledWith({
        where: { tenantId: 1, deletedAt: { not: null } },
      });
    });

    it('should permanently delete all soft-deleted permissions in recycle bin', async () => {
      const softDeletedPermissions = [
        { id: 2, name: 'EDIT_PROJECTS', tenantId: 1, deletedAt: new Date() },
        { id: 3, name: 'DELETE_PROJECTS', tenantId: 1, deletedAt: new Date() },
      ];
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValue(softDeletedPermissions);
      (prismaService.tenantPermission.deleteMany as jest.Mock).mockResolvedValue({ count: softDeletedPermissions.length });

      const deleteCount = await service.clearRecycleBinForTenant(1);

      expect(deleteCount).toEqual(softDeletedPermissions.length);
      expect(prismaService.tenantPermission.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: 1, deletedAt: { not: null } },
      });
    });
  });

  describe('restorePermission', () => {
    it('should restore a soft-deleted permission and log the action', async () => {
      const softDeletedPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1, deletedAt: new Date() };
      const restoredPermission = { ...softDeletedPermission, deletedAt: null };

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(softDeletedPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockResolvedValue(restoredPermission);

      const result = await service.restorePermission(1, 1, 1);

      expect(result).toEqual(restoredPermission);
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESTORE_TENANT_PERMISSION' }));
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission is not deleted', async () => {
      const activePermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1, deletedAt: null };
      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(activePermission);

      await expect(service.restorePermission(1, 1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Permission Caching', () => {

    it('should cache permissions for performance during repeated fetches', async () => {
      const permissions = [{ id: 1, name: 'VIEW_PROJECTS', tenantId: 1 }];
      (prismaService.tenantPermission.findMany as jest.Mock).mockResolvedValueOnce(permissions);
      const cacheKey = cacheService.generateCacheKey('tenant', '1', 'permissions');

      // Mock cacheService.get to return undefined initially (cache miss)
      (cacheService.get as jest.Mock).mockResolvedValueOnce(undefined);

      // First fetch - should retrieve from the database and set the cache
      const result1 = await service.getPermissionsForTenant(1, 1);
      expect(result1).toEqual(permissions);
      expect(prismaService.tenantPermission.findMany).toHaveBeenCalledTimes(1);
      expect(cacheService.set).toHaveBeenCalledWith(cacheKey, permissions);

      // Mock cacheService.get to return cached permissions on second call
      (cacheService.get as jest.Mock).mockResolvedValueOnce(permissions);

      // Clear mock calls to isolate cache validation in second call
      jest.clearAllMocks();

      // Second fetch - should retrieve from the cache and avoid database call
      const result2 = await service.getPermissionsForTenant(1, 1);
      expect(result2).toEqual(permissions);
      expect(prismaService.tenantPermission.findMany).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should verify cache invalidation after creation', async () => {
      const createDto: CreateTenantPermissionDto = {
        name: 'VIEW_PROJECTS',
        tenantId: 1,
        description: 'Allows viewing projects',
      };
      const createdPermission = { id: 1, ...createDto, createdAt: new Date(), updatedAt: new Date() };
      (prismaService.tenantPermission.create as jest.Mock).mockResolvedValue(createdPermission);

      await service.createTenantPermission(createDto, 1, 1);

      expect(cacheService.clear).toHaveBeenCalledWith(expect.any(String));
    });

    it('should consistently invalidate cache during concurrent updates', async () => {
      const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_VIEW_PROJECTS' };
      const existingPermission = { id: 1, name: 'VIEW_PROJECTS', tenantId: 1 };
      const updatedPermission = { ...existingPermission, ...updateDto };
      const cacheKey = cacheService.generateCacheKey('tenant', '1', `permission-${existingPermission.id}`);

      (prismaService.tenantPermission.findUnique as jest.Mock).mockResolvedValue(existingPermission);
      (prismaService.tenantPermission.update as jest.Mock).mockResolvedValue(updatedPermission);

      // Run two concurrent updates
      const [result1, result2] = await Promise.all([
        service.updateTenantPermission(1, updateDto, 1, 1),
        service.updateTenantPermission(1, updateDto, 1, 1),
      ]);

      expect(result1).toEqual(updatedPermission);
      expect(result2).toEqual(updatedPermission);
      expect(cacheService.clear).toHaveBeenCalledWith(cacheKey);
      expect(cacheService.clear).toHaveBeenCalledTimes(2); // Cache should be invalidated on each concurrent update
    });

  });

  describe('Error Handling', () => {

    it('should handle Prisma unique constraint violations with meaningful messages', async () => {
      const createDto: CreateTenantPermissionDto = { name: 'VIEW_PROJECTS', tenantId: 1, description: 'Allows viewing projects' };

      // Mock the Prisma create function to simulate a unique constraint violation
      (prismaService.tenantPermission.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
          code: 'P2002',
          clientVersion: '2.0.0',
          meta: { target: ['field_name'] }, // Include meta if your handleError uses it
        }),
      );

      await expect(service.createTenantPermission(createDto, 1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.createTenantPermission(createDto, 1, 1)).rejects.toThrow('Unique constraint violation');
    });

    it('should handle temporary network/database connection errors with retries', async () => {
      const createDto: CreateTenantPermissionDto = { name: 'VIEW_PROJECTS', tenantId: 1, description: 'Allows viewing projects' };
      const createdPermission = { id: 1, ...createDto, createdAt: new Date(), updatedAt: new Date() };

      // Simulate a temporary database connection error on the first call and success on the retry
      (prismaService.tenantPermission.create as jest.Mock)
        .mockRejectedValueOnce(new Error('Database connection error'))
        .mockResolvedValueOnce(createdPermission);

      const result = await service.createTenantPermission(createDto, 1, 1);

      expect(result).toEqual(createdPermission);
      expect(prismaService.tenantPermission.create).toHaveBeenCalledTimes(2); // Retry attempt after the initial failure
    });

  });

});
