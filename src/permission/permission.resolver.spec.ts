import { Test, TestingModule } from '@nestjs/testing';
import { PermissionResolver } from './permission.resolver';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

describe('PermissionResolver', () => {
  let resolver: PermissionResolver;
  let service: PermissionService;

  const mockPermission = {
    id: 1,
    name: 'VIEW_USERS',
    description: 'Permission to view users',
    type: 'GLOBAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: jest.fn().mockResolvedValue(mockPermission),
    findAll: jest.fn().mockResolvedValue([mockPermission]),
    findOne: jest.fn().mockResolvedValue(mockPermission),
    update: jest.fn().mockResolvedValue(mockPermission),
    remove: jest.fn().mockResolvedValue(mockPermission),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionResolver,
        {
          provide: PermissionService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<PermissionResolver>(PermissionResolver);
    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createPermission', () => {
    it('should create a new permission', async () => {
      const createDto: CreatePermissionDto = {
        name: 'CREATE_USERS',
        description: 'Permission to create users',
        type: 'GLOBAL',
      };
      expect(await resolver.createPermission(createDto)).toEqual(mockPermission);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('permissions', () => {
    it('should return an array of permissions', async () => {
      expect(await resolver.permissions()).toEqual([mockPermission]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('permission', () => {
    it('should return a permission by ID', async () => {
      expect(await resolver.permission(1)).toEqual(mockPermission);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('updatePermission', () => {
    it('should update a permission', async () => {
      const updateDto: UpdatePermissionDto = { name: 'EDIT_USERS' };
      expect(await resolver.updatePermission(1, updateDto)).toEqual(mockPermission);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('removePermission', () => {
    it('should delete a permission', async () => {
      expect(await resolver.removePermission(1)).toEqual(mockPermission);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
