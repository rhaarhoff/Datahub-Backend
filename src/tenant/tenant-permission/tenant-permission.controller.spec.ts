import { Test, TestingModule } from '@nestjs/testing';
import { TenantPermissionController } from './tenant-permission.controller';
import { TenantPermissionService } from './tenant-permission.service';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { ForbiddenException, BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { CreateTenantPermissionDto } from './dto/create-tenant-permission.dto';
import { UpdateTenantPermissionDto } from './dto/update-tenant-permission.dto';

describe('TenantPermissionController', () => {
  let controller: TenantPermissionController;
  let service: TenantPermissionService;
  let casbinHelperService: CasbinHelperService;

  const userId = 1;
  const tenantId = 1;
  const createDto: CreateTenantPermissionDto = { name: 'VIEW_PROJECTS', tenantId };
  const updateDto: UpdateTenantPermissionDto = { name: 'UPDATED_PROJECTS' };

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
            getDeletedPermissionsForTenant: jest.fn(), // Ensure this is mocked
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

  // **Create Permission Tests**
  describe('Create Permission', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create a valid tenant permission', async () => {
      await controller.createTenantPermission(createDto, tenantId, userId);
      expect(service.createTenantPermission).toHaveBeenCalledWith(createDto, tenantId, userId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to create a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.createTenantPermission(createDto, tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.createTenantPermission).not.toHaveBeenCalled();
    });

    it('should handle duplicate data error when creating a permission', async () => {
      jest.spyOn(service, 'createTenantPermission').mockRejectedValue(new BadRequestException('Unique constraint error'));
      await expect(controller.createTenantPermission(createDto, tenantId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required fields are missing in CreateTenantPermissionDto', async () => {
      const invalidCreateDto: CreateTenantPermissionDto = { name: '', tenantId: null }; // Invalid values
      await expect(
        new ValidationPipe({ transform: true }).transform(invalidCreateDto, {
          type: 'body',
          metatype: CreateTenantPermissionDto,
        })
      ).rejects.toThrow(BadRequestException);
      expect(service.createTenantPermission).not.toHaveBeenCalled();
    });
  });

  // **Get Permissions Tests**
  describe('Get Permissions', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should retrieve all permissions for a tenant', async () => {
      await controller.getPermissionsForTenant(tenantId, userId);
      expect(service.getPermissionsForTenant).toHaveBeenCalledWith(tenantId, userId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to view tenant permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.getPermissionsForTenant(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.getPermissionsForTenant).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no permissions are found for a tenant', async () => {
      jest.spyOn(service, 'getPermissionsForTenant').mockRejectedValue(new NotFoundException(`No permissions found for tenant with ID ${tenantId}`));
      await expect(controller.getPermissionsForTenant(tenantId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // **Update Permission Tests**
  describe('Update Permission', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should update an existing tenant permission', async () => {
      await controller.updateTenantPermission(1, tenantId, userId, updateDto);
      expect(service.updateTenantPermission).toHaveBeenCalledWith(1, updateDto, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to update a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.updateTenantPermission(1, tenantId, userId, updateDto)).rejects.toThrow(ForbiddenException);
      expect(service.updateTenantPermission).not.toHaveBeenCalled();
    });
  });

  // **Delete Permission Tests**
  describe('Delete Permission', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should soft delete an existing tenant permission', async () => {
      await controller.deleteTenantPermission(1, userId, tenantId);
      expect(service.deleteTenantPermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to delete a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.deleteTenantPermission(1, userId, tenantId)).rejects.toThrow(ForbiddenException);
      expect(service.deleteTenantPermission).not.toHaveBeenCalled();
    });
  });

  // **Get Deleted Permissions Tests**
  describe('Get Deleted Permissions', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should throw ForbiddenException when unauthorized user attempts to view deleted permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.getDeletedPermissionsForTenant(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.getDeletedPermissionsForTenant).not.toHaveBeenCalled();
    });
  });

  // **Restore Permission Tests**
  describe('Restore Permission', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should restore a deleted permission', async () => {
      await controller.restorePermission(1, userId, tenantId);
      expect(service.restorePermission).toHaveBeenCalledWith(1, userId, tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to restore a deleted permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.restorePermission(1, userId, tenantId)).rejects.toThrow(ForbiddenException);
      expect(service.restorePermission).not.toHaveBeenCalled();
    });
  });

  // **Clear Recycle Bin Tests**
  describe('Clear Recycle Bin', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should clear the recycle bin for a tenant', async () => {
      await controller.clearRecycleBin(tenantId, userId);
      expect(service.clearRecycleBin).toHaveBeenCalledWith(tenantId);
    });

    it('should throw ForbiddenException when unauthorized user attempts to clear the recycle bin', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());
      await expect(controller.clearRecycleBin(tenantId, userId)).rejects.toThrow(ForbiddenException);
      expect(service.clearRecycleBin).not.toHaveBeenCalled();
    });
  });
});
