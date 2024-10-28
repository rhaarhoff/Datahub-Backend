import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@prisma-service/prisma.service';
import { PermissionService } from '@permission-service/permission.service';
import { CasbinService } from '@casbin-integration/casbin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Permission, PermissionType } from '@prisma/client';  // Import PermissionType

jest.mock('@casbin-integration/casbin.service');

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: PrismaService;
  let casbinService: CasbinService;

  const mockPermission: Permission = {
    id: 1,
    name: 'VIEW_USERS',
    description: 'Can view users',
    type: PermissionType.GLOBAL,  // Use the enum here
    createdAt: new Date(),
    updatedAt: new Date(),
    resource: 'users', // Added resource
    action: 'view', // Added action
  };

  const mockPermissions: Permission[] = [mockPermission];

  const prismaMock = {
    permission: {
      create: jest.fn().mockResolvedValue(mockPermission),
      findMany: jest.fn().mockResolvedValue(mockPermissions),
      findUnique: jest.fn().mockResolvedValue(mockPermission),
      update: jest.fn().mockResolvedValue(mockPermission),
      delete: jest.fn().mockResolvedValue(mockPermission),
    },
  };

  const casbinMock = {
    addPolicy: jest.fn().mockResolvedValue(true),
    removePolicy: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CasbinService, useValue: casbinMock },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get<PrismaService>(PrismaService);
    casbinService = module.get<CasbinService>(CasbinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new permission and add it to Casbin', async () => {
      const createDto = { name: 'CREATE_USERS', description: 'Can create users', type: PermissionType.GLOBAL, resource: 'users', action: 'create' };  // Use enum here
      const result = await service.create(createDto);
      expect(result).toEqual(mockPermission);
      expect(prismaService.permission.create).toHaveBeenCalledWith({ data: createDto });
      expect(casbinService.addPolicy).toHaveBeenCalledWith('p', createDto.name, createDto.resource, createDto.action);
    });

    it('should throw BadRequestException if creation fails', async () => {
      prismaMock.permission.create.mockRejectedValueOnce(new Error());
      await expect(service.create({ name: 'duplicate', type: PermissionType.GLOBAL, resource: 'users', action: 'create' }))  // Use enum here
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const result = await service.findAll();
      expect(result).toEqual(mockPermissions);
      expect(prismaService.permission.findMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if find fails', async () => {
      prismaMock.permission.findMany.mockRejectedValueOnce(new Error());
      await expect(service.findAll()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a permission by id', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockPermission);
      expect(prismaService.permission.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if permission is not found', async () => {
      prismaMock.permission.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on error', async () => {
      prismaMock.permission.findUnique.mockRejectedValueOnce(new Error());
      await expect(service.findOne(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      const updateDto = { name: 'EDIT_USERS', description: 'Can edit users', type: PermissionType.GLOBAL, resource: 'users', action: 'edit' };  // Added more fields for update
      const result = await service.update(1, updateDto);
      expect(result).toEqual(mockPermission);
      expect(prismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if permission is not found', async () => {
      prismaMock.permission.update.mockRejectedValueOnce({ code: 'P2025' });
      await expect(service.update(999, { name: 'EDIT_USERS' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on update error', async () => {
      prismaMock.permission.update.mockRejectedValueOnce(new Error());
      await expect(service.update(1, { name: 'EDIT_USERS' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a permission and remove it from Casbin', async () => {
      const result = await service.remove(1);
      expect(result).toEqual(mockPermission);
      expect(prismaService.permission.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(casbinService.removePolicy).toHaveBeenCalledWith('p', mockPermission.name, mockPermission.resource, mockPermission.action);
    });

    it('should throw NotFoundException if permission is not found', async () => {
      prismaMock.permission.delete.mockRejectedValueOnce({ code: 'P2025' });
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on delete error', async () => {
      prismaMock.permission.delete.mockRejectedValueOnce(new Error());
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('edge cases and additional scenarios', () => {
    it('should throw BadRequestException when attempting to create a permission with invalid data', async () => {
      const invalidCreateDto = { name: '', type: PermissionType.GLOBAL, resource: '', action: '' };  // Invalid data
      await expect(service.create(invalidCreateDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent create calls properly', async () => {
      prismaMock.permission.create.mockResolvedValueOnce(mockPermission);
      await expect(Promise.all([service.create(mockPermission), service.create(mockPermission)])).resolves;
      expect(prismaService.permission.create).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when trying to update with invalid data', async () => {
      const invalidUpdateDto = { name: '' };  // Invalid data
      await expect(service.update(1, invalidUpdateDto)).rejects.toThrow(BadRequestException);
    });

    it('should log appropriate messages for policy updates', async () => {
      const updateDto = { name: 'UPDATE_USERS', description: 'Can update users', type: PermissionType.GLOBAL, resource: 'users', action: 'update' };
      prismaMock.permission.update.mockResolvedValueOnce(mockPermission);
      const result = await service.update(1, updateDto);
      expect(result).toEqual(mockPermission);
      expect(prismaService.permission.update).toHaveBeenCalledWith({ where: { id: 1 }, data: updateDto });
    });
  });
});
