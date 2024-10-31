import { Test, TestingModule } from '@nestjs/testing';
import { TenantPermissionResolver } from './tenant-permission.resolver';
import { TenantPermissionService } from './tenant-permission.service';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { ForbiddenException } from '@nestjs/common';
import { CreateTenantPermissionInput } from './input/create-tenant-permission.input';
import { UpdateTenantPermissionInput } from './input/update-tenant-permission.input';
import { TenantPermission } from './models/tenant-permission.model';

describe('TenantPermissionResolver', () => {
  let resolver: TenantPermissionResolver;
  let service: TenantPermissionService;
  let casbinHelperService: CasbinHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantPermissionResolver,
        {
          provide: TenantPermissionService,
          useValue: {
            create: jest.fn(),
            findPermissionsForTenant: jest.fn(),
            updateTenantPermission: jest.fn(),
            deleteTenantPermission: jest.fn(),
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

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('Authorization Tests', () => {
    const userId = 1;
    const tenantId = 1;
    const createInput: CreateTenantPermissionInput = { name: 'VIEW_PROJECTS', tenantId };
    const updateInput: UpdateTenantPermissionInput = {
      name: 'UPDATED_PROJECTS',
      tenantId: 0
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should allow Admin to create a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockResolvedValue();

      await resolver.createTenantPermission(userId, tenantId, createInput);

      expect(service.create).toHaveBeenCalledWith(createInput);
    });

    it('should throw ForbiddenException when unauthorized user attempts to create a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());

      await expect(resolver.createTenantPermission(userId, tenantId, createInput)).rejects.toThrow(ForbiddenException);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when unauthorized user attempts to view tenant permissions', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());

      await expect(resolver.findAllPermissions(tenantId)).rejects.toThrow(ForbiddenException);
      expect(service.findPermissionsForTenant).not.toHaveBeenCalled();
    });

    it('should allow Admin to update a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockResolvedValue();

      await resolver.updateTenantPermission(userId, tenantId, 1, updateInput);

      expect(service.updateTenantPermission).toHaveBeenCalledWith(1, updateInput);
    });

    it('should throw ForbiddenException when unauthorized user attempts to update a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());

      await expect(resolver.updateTenantPermission(userId, tenantId, 1, updateInput)).rejects.toThrow(ForbiddenException);
      expect(service.updateTenantPermission).not.toHaveBeenCalled();
    });

    it('should allow Admin to delete a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockResolvedValue();

      await resolver.deleteTenantPermission(userId, tenantId, 1);

      expect(service.deleteTenantPermission).toHaveBeenCalledWith(1);
    });

    it('should throw ForbiddenException when unauthorized user attempts to delete a tenant permission', async () => {
      jest.spyOn(casbinHelperService, 'enforceAuthorization').mockRejectedValue(new ForbiddenException());

      await expect(resolver.deleteTenantPermission(userId, tenantId, 1)).rejects.toThrow(ForbiddenException);
      expect(service.deleteTenantPermission).not.toHaveBeenCalled();
    });
  });
});
