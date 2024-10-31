import { Test, TestingModule } from '@nestjs/testing';
import { TenantPermissionController } from './tenant-permission.controller';
import { TenantPermissionService } from './tenant-permission.service';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { ForbiddenException } from '@nestjs/common';
import { CreateTenantPermissionDto } from './dto/create-tenant-permission.dto';
import { UpdateTenantPermissionDto } from './dto/update-tenant-permission.dto';

describe('TenantPermissionController', () => {
  let controller: TenantPermissionController;
  let service: TenantPermissionService;
  let casbinHelperService: CasbinHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantPermissionController],
      providers: [
        {
          provide: TenantPermissionService,
          useValue: {
            createTenantPermission: jest.fn(),
            getPermissionsForTenant: jest.fn(),
            updateTenantPermission: jest.fn(),
            deleteTenantPermission: jest.fn(),
            getDeletedPermissions: jest.fn(),
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

    controller = module.get<TenantPermissionController>(TenantPermissionController);
    service = module.get<TenantPermissionService>(TenantPermissionService);
    casbinHelperService = module.get<CasbinHelperService>(CasbinHelperService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Authorization Tests', () => {
    const userId = 1;
    const tenantId = 1;
    const createDto: CreateTenantPermissionDto = { name: 'VIEW_PROJECTS', tenantId };
    const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_PROJECTS' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const controllerMethodCalls = {
      create: () => controller.createTenantPermission(createDto, tenantId, userId),
      view: () => controller.getPermissionsForTenant(tenantId, userId),
      update: () => controller.updateTenantPermission(1, tenantId, userId, updateDto),
      delete: () => controller.deleteTenantPermission(1, userId, tenantId),
      restore: () => controller.restorePermission(1, userId, tenantId),
      clearRecycleBin: () => controller.clearRecycleBin(tenantId, userId),
    };

    it('should allow Admin to create a tenant permission', async () => {
      await controllerMethodCalls.create();
      expect(service.createTenantPermission).toHaveBeenCalledWith(createDto, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to create a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.create).rejects.toThrow(ForbiddenException);
      expect(service.createTenantPermission).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when unauthorized user attempts to view tenant permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.view).rejects.toThrow(ForbiddenException);
      expect(service.getPermissionsForTenant).not.toHaveBeenCalled();
    });

    it('should allow Admin to update a tenant permission', async () => {
      await controllerMethodCalls.update();
      expect(service.updateTenantPermission).toHaveBeenCalledWith(1, updateDto, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to update a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.update).rejects.toThrow(ForbiddenException);
      expect(service.updateTenantPermission).not.toHaveBeenCalled();
    });

    it('should allow Admin to delete a tenant permission', async () => {
      await controllerMethodCalls.delete();
      expect(service.deleteTenantPermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to delete a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.delete).rejects.toThrow(ForbiddenException);
      expect(service.deleteTenantPermission).not.toHaveBeenCalled();
    });

    it('should allow Admin to restore a deleted permission', async () => {
      await controllerMethodCalls.restore();
      expect(service.restorePermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to restore a deleted permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.restore).rejects.toThrow(ForbiddenException);
      expect(service.restorePermission).not.toHaveBeenCalled();
    });

    it('should allow Admin to clear the recycle bin', async () => {
      await controllerMethodCalls.clearRecycleBin();
      expect(service.clearRecycleBin).toHaveBeenCalledWith(tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to clear the recycle bin', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controllerMethodCalls.clearRecycleBin).rejects.toThrow(ForbiddenException);
      expect(service.clearRecycleBin).not.toHaveBeenCalled();
    });
  });
});
