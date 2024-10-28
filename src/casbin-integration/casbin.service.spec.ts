import { Test, TestingModule } from '@nestjs/testing';
import { CasbinService } from './casbin.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { PrismaAdapterService } from './prisma-adapter.service';
import { Enforcer, newEnforcer } from 'casbin';
import { BadRequestException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/interfaces/audit-action.enum';

jest.mock('casbin', () => ({
  ...jest.requireActual('casbin'),
  newEnforcer: jest.fn(),
}));

describe('CasbinService', () => {
  let service: CasbinService;
  let prismaService: PrismaService;
  let prismaAdapterService: PrismaAdapterService;
  let cacheService: CacheService;
  let auditService: AuditService;
  let mockEnforcer: Enforcer;

  beforeEach(async () => {
    mockEnforcer = {
      enforce: jest.fn().mockResolvedValue(true),
      addPolicy: jest.fn().mockResolvedValue(true),
      removePolicy: jest.fn().mockResolvedValue(true),
      loadPolicy: jest.fn().mockResolvedValue({}),
      getPolicy: jest.fn().mockResolvedValue([['user', 'resource', 'read']]),
      addGroupingPolicy: jest.fn().mockResolvedValue(true),
      updateGroupingPolicy: jest.fn().mockResolvedValue(true),
      removeGroupingPolicy: jest.fn().mockResolvedValue(true),
      hasPolicy: jest.fn().mockResolvedValue(true),
    } as unknown as Enforcer;

    (newEnforcer as jest.Mock).mockResolvedValue(mockEnforcer);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasbinService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest
              .fn()
              .mockImplementation(async (cb) => await cb(prismaService)),
            casbinRule: {
              deleteMany: jest.fn().mockResolvedValue({}),
              createMany: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: PrismaAdapterService,
          useValue: {
            addPolicy: jest.fn().mockResolvedValue({}),
            removePolicy: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: CacheService,
          useValue: {
            generateCacheKey: jest.fn().mockReturnValue('casbin:policies'),
            getOrFetch: jest
              .fn()
              .mockImplementation((key, fetchFunc) => fetchFunc()),
            clear: jest.fn().mockResolvedValue(true),
            getTTLForFeature: jest.fn().mockReturnValue(3600),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<CasbinService>(CasbinService);
    prismaService = module.get<PrismaService>(PrismaService);
    prismaAdapterService =
      module.get<PrismaAdapterService>(PrismaAdapterService);
    cacheService = module.get<CacheService>(CacheService);
    auditService = module.get<AuditService>(AuditService);

    // Manually call onModuleInit to initialize the enforcer
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize enforcer on module init', async () => {
    expect(mockEnforcer.loadPolicy).toHaveBeenCalled();
  });

  it('should enforce a policy', async () => {
    const result = await service.enforce('user', 'resource', 'read');
    expect(mockEnforcer.enforce).toHaveBeenCalledWith(
      'user',
      'resource',
      'read',
    );
    expect(result).toBe(true);
  });

  it('should add a policy (RBAC) and save to database', async () => {
    const args: [string, string, string] = ['user', 'resource', 'write'];
    await service.addPolicy(1, ...args);

    expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(...args);
    expect(prismaAdapterService.addPolicy).toHaveBeenCalledWith(
      'p',
      args[0],
      args,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.CREATE_POLICY,
      userId: 1,
      before: null,
      after: { sub: 'user', obj: 'resource', act: 'write', attrs: [] },
    });
    expect(cacheService.clear).toHaveBeenCalledWith('casbin:policies');
  });

  it('should add a policy with attributes (ABAC) and save to database', async () => {
    // Tuple type: first three are required, rest are optional attributes
    const args: [string, string, string, ...string[]] = [
      'user',
      'resource',
      'read',
      'tenantId == "123"',
    ];
    await service.addPolicy(1, ...args); // Spread operator works now

    expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(...args);
    expect(prismaAdapterService.addPolicy).toHaveBeenCalledWith(
      'p',
      args[0],
      args,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.CREATE_POLICY,
      userId: 1,
      before: null,
      after: {
        sub: 'user',
        obj: 'resource',
        act: 'read',
        attrs: ['tenantId == "123"'],
      },
    });
    expect(cacheService.clear).toHaveBeenCalledWith('casbin:policies');
  });

  it('should remove a policy and save to database', async () => {
    // Tuple type: first three are required, rest are optional attributes
    const args: [string, string, string, ...string[]] = [
      'user',
      'resource',
      'delete',
      'tenantId == "123"',
    ];
    await service.removePolicy(1, ...args); // Spread operator works now

    expect(mockEnforcer.removePolicy).toHaveBeenCalledWith(...args);
    expect(prismaAdapterService.removePolicy).toHaveBeenCalledWith(
      'p',
      args[0],
      args,
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.DELETE_POLICY,
      userId: 1,
      before: {
        sub: 'user',
        obj: 'resource',
        act: 'delete',
        attrs: ['tenantId == "123"'],
      },
      after: null,
    });
    expect(cacheService.clear).toHaveBeenCalledWith('casbin:policies');
  });

  it('should handle error when adding a policy fails', async () => {
    (mockEnforcer.addPolicy as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to add policy'),
    );

    await expect(
      service.addPolicy(1, 'user', 'resource', 'write'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should save policies to the database', async () => {
    await service.savePoliciesToDatabase();

    expect(prismaService.$transaction).toHaveBeenCalled();
    expect(prismaService.casbinRule.deleteMany).toHaveBeenCalled();
    expect(mockEnforcer.getPolicy).toHaveBeenCalled();
    expect(prismaService.casbinRule.createMany).toHaveBeenCalled();
  });

  it('should add a role', async () => {
    const role = 'newRole';
    await service.addRole(role, 1);

    expect(mockEnforcer.addGroupingPolicy).toHaveBeenCalledWith(role);
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.ADD_ROLE,
      userId: 1,
      before: null,
      after: { role },
    });
  });

  it('should update a role', async () => {
    const oldRole = 'oldRole';
    const newRole = 'newRole';
    await service.updateRole(oldRole, newRole, 1);

    expect(mockEnforcer.updateGroupingPolicy).toHaveBeenCalledWith(
      [oldRole],
      [newRole],
    );
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.UPDATE_ROLE,
      userId: 1,
      before: { role: oldRole },
      after: { role: newRole },
    });
  });

  it('should remove a role', async () => {
    const role = 'roleToRemove';
    await service.removeRole(role, 1);

    expect(mockEnforcer.removeGroupingPolicy).toHaveBeenCalledWith(role);
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.DELETE_ROLE,
      userId: 1,
      before: { role },
      after: null,
    });
  });

  it('should get all policies', async () => {
    const policies = await service.getAllPolicies();

    expect(mockEnforcer.getPolicy).toHaveBeenCalled();
    expect(policies).toEqual([['user', 'resource', 'read']]);
  });

  it('should check if a policy exists', async () => {
    const exists = await service.policyExists('user', 'resource', 'read');
    expect(mockEnforcer.hasPolicy).toHaveBeenCalledWith(
      'user',
      'resource',
      'read',
    );
    expect(exists).toBe(true);
  });

  it('should handle enforcer initialization when not initialized', async () => {
    service['isInitialized'] = false; // Simulate uninitialized state
    const enforceSpy = jest.spyOn(service, 'onModuleInit');

    await service.enforce('user', 'resource', 'read');
    expect(enforceSpy).toHaveBeenCalled(); // Ensure onModuleInit is called
  });

  it('should throw error when loading policies from the database fails', async () => {
    (mockEnforcer.loadPolicy as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to load policies'),
    );

    await expect(service.loadPoliciesFromDatabase()).rejects.toThrow(
      BadRequestException,
    );
  });
});
