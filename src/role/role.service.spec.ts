import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { PrismaService } from '../prisma/prisma.service';
import { CasbinService } from '../casbin/casbin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, RoleType } from '@prisma/client';

describe('RoleService', () => {
  let service: RoleService;
  let prisma: PrismaService;
  let casbin: CasbinService;

  const mockRole: Role = {
    id: 1,
    name: 'ADMIN',
    description: 'Admin role',
    type: RoleType.GLOBAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (cb) => await cb(mockPrismaService)),
    role: {
      create: jest.fn().mockReturnValue(Promise.resolve(mockRole)),
      findMany: jest.fn().mockReturnValue(Promise.resolve([mockRole])),
      findUnique: jest.fn().mockReturnValue(Promise.resolve(mockRole)),
      update: jest.fn().mockReturnValue(Promise.resolve(mockRole)),
      delete: jest.fn().mockReturnValue(Promise.resolve(mockRole)),
    },
  };

  const mockCasbinService = {
    addRole: jest.fn().mockResolvedValue(true),
    updateRole: jest.fn().mockResolvedValue(true),
    removeRole: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CasbinService,
          useValue: mockCasbinService,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    prisma = module.get<PrismaService>(PrismaService);
    casbin = module.get<CasbinService>(CasbinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a role and add it to Casbin', async () => {
      const createRoleDto = { name: 'ADMIN', description: 'Admin role', type: RoleType.GLOBAL };
      const result = await service.create(createRoleDto);
      expect(result).toEqual(mockRole);
      expect(prisma.role.create).toHaveBeenCalledWith({ data: createRoleDto });
      expect(casbin.addRole).toHaveBeenCalledWith('ADMIN');
    });

    it('should throw BadRequestException on unique constraint violation', async () => {
      prisma.role.create.mockReturnValueOnce(Promise.reject({ code: 'P2002' }));
      await expect(service.create({ name: 'ADMIN', description: 'Admin role', type: RoleType.GLOBAL }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockRole]);
      expect(prisma.role.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a role by ID', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockRole);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if role not found', async () => {
      prisma.role.findUnique.mockReturnValueOnce(Promise.resolve(null));
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a role and update Casbin if role name changes', async () => {
      const updateRoleDto = { name: 'UPDATED_ROLE', description: 'Updated description' };
      const result = await service.update(1, updateRoleDto);
      expect(result).toEqual(mockRole);
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateRoleDto,
      });
      expect(casbin.updateRole).toHaveBeenCalledWith('ADMIN', 'UPDATED_ROLE');
    });

    it('should not call Casbin update if the role name has not changed', async () => {
      const updateRoleDto = { name: 'ADMIN', description: 'Updated description' };
      await service.update(1, updateRoleDto);
      expect(casbin.updateRole).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found for update', async () => {
      prisma.role.findUnique.mockReturnValueOnce(Promise.resolve(null));
      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a role and remove it from Casbin', async () => {
      const result = await service.remove(1);
      expect(result).toEqual(mockRole);
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(casbin.removeRole).toHaveBeenCalledWith('ADMIN');
    });

    it('should throw NotFoundException if role not found for deletion', async () => {
      prisma.role.findUnique.mockReturnValueOnce(Promise.resolve(null));
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
