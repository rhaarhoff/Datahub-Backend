import { Test, TestingModule } from '@nestjs/testing';
import { TenantPermissionResolver } from './tenant-permission.resolver';
import { TenantPermissionService } from './tenant-permission.service';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTenantPermissionInput } from './input/create-tenant-permission.input';
import { UpdateTenantPermissionInput } from './input/update-tenant-permission.input';

describe('TenantPermissionResolver', () => {
  let resolver: TenantPermissionResolver;
  let service: TenantPermissionService;
  let casbinHelperService: CasbinHelperService;

  const tenantId = 1;
  const userId = 1;
  const createInput: CreateTenantPermissionInput = { name: 'VIEW_PROJECTS', tenantId };
  const updateInput: UpdateTenantPermissionInput = {
    name: 'UPDATED_PROJECTS',
    tenantId: 0
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantPermissionResolver,
        {
          provide: TenantPermissionService,
          useValue: {
            createTenantPermission: jest.fn(),
            getPermissionsForTenant: jest.fn(),
            updateTenantPermission: jest.fn(),
            deleteTenantPermission: jest.fn(),
            getDeletedPermissionsForTenant: jest.fn(),
            restorePermission: jest.fn(),
            clearRecycleBin: jest.fn(),
          },
        },
        {
          provide: CasbinHelperService,
          useValue: {
            enforceAuthorization: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    resolver = module.get<TenantPermissionResolver>(TenantPermissionResolver);
    service = module.get<TenantPermissionService>(TenantPermissionService);
    casbinHelperService = module.get<CasbinHelperService>(CasbinHelperService);
  });

  describe('Create Permission', () => {
    it('should create a valid tenant permission', async () => {
      await resolver.createTenantPermission(tenantId, userId, createInput);
      expect(service.createTenantPermission).toHaveBeenCalledWith(createInput, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized role attempts to create permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.createTenantPermission(tenantId, userId, createInput)).rejects.toThrow(ForbiddenException);
      expect(service.createTenantPermission).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on duplicate data', async () => {
      jest.spyOn(service, 'createTenantPermission').mockRejectedValue(new BadRequestException('Duplicate'));
      await expect(resolver.createTenantPermission(tenantId, userId, createInput)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on missing required fields', async () => {
      const invalidInput = { name: '', tenantId: null } as CreateTenantPermissionInput;
      await expect(resolver.createTenantPermission(tenantId, userId, invalidInput)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Get Permissions', () => {
    it('should retrieve all permissions for a tenant', async () => {
      await resolver.getPermissionsForTenant(tenantId, userId);
      expect(service.getPermissionsForTenant).toHaveBeenCalledWith(tenantId, userId);
    });

    it('should throw ForbiddenException when unauthorized user tries to view permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.getPermissionsForTenant(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.getPermissionsForTenant).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if no permissions found for a tenant', async () => {
      jest.spyOn(service, 'getPermissionsForTenant').mockRejectedValue(new NotFoundException());
      await expect(resolver.getPermissionsForTenant(tenantId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update Permission', () => {
    it('should update an existing tenant permission', async () => {
      await resolver.updateTenantPermission(1, tenantId, userId, updateInput);
      expect(service.updateTenantPermission).toHaveBeenCalledWith(1, updateInput, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized role attempts to update permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.updateTenantPermission(1, tenantId, userId, updateInput)).rejects.toThrow(ForbiddenException);
      expect(service.updateTenantPermission).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid update data', async () => {
      const invalidUpdateInput = { name: '' } as UpdateTenantPermissionInput;
      await expect(resolver.updateTenantPermission(1, tenantId, userId, invalidUpdateInput)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Delete Permission', () => {
    it('should soft delete an existing tenant permission', async () => {
      await resolver.deleteTenantPermission(1, userId, tenantId);
      expect(service.deleteTenantPermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized role attempts to delete permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.deleteTenantPermission(1, userId, tenantId)).rejects.toThrow(ForbiddenException);
      expect(service.deleteTenantPermission).not.toHaveBeenCalled();
    });
  });

  describe('Get Deleted Permissions', () => {
    it('should throw ForbiddenException when unauthorized role tries to view deleted permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.getDeletedPermissions(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.getDeletedPermissionsForTenant).not.toHaveBeenCalled();
    });
  });

  describe('Restore Permission', () => {
    it('should restore a deleted permission', async () => {
      await resolver.restorePermission(1, userId, tenantId);
      expect(service.restorePermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized role tries to restore permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.restorePermission(1, userId, tenantId)).rejects.toThrow(ForbiddenException);
      expect(service.restorePermission).not.toHaveBeenCalled();
    });
  });

  describe('Clear Recycle Bin', () => {
    it('should clear the recycle bin for a tenant', async () => {
      await resolver.clearRecycleBin(tenantId, userId);
      expect(service.clearRecycleBin).toHaveBeenCalledWith(tenantId);
    });

    it('should throw ForbiddenException when unauthorized role tries to clear the recycle bin', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(resolver.clearRecycleBin(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.clearRecycleBin).not.toHaveBeenCalled();
    });
  });
});
