import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

describe('PermissionController', () => {
  let controller: PermissionController;
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
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PermissionController>(PermissionController);
    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a permission', async () => {
      const createDto: CreatePermissionDto = {
        name: 'CREATE_USERS',
        description: 'Permission to create users',
        type: 'GLOBAL',
      };
      expect(await controller.create(createDto)).toEqual(mockPermission);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of permissions', async () => {
      expect(await controller.findAll()).toEqual([mockPermission]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a permission by ID', async () => {
      expect(await controller.findOne(1)).toEqual(mockPermission);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      const updateDto: UpdatePermissionDto = { name: 'EDIT_USERS' };
      expect(await controller.update(1, updateDto)).toEqual(mockPermission);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a permission', async () => {
      expect(await controller.remove(1)).toEqual(mockPermission);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
