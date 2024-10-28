import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAdapterService } from './prisma-adapter.service';
import { PrismaService } from '@prisma-service/prisma.service';

describe('PrismaAdapterService', () => {
  let service: PrismaAdapterService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAdapterService,
        {
          provide: PrismaService,
          useValue: {
            casbinRule: {
              findMany: jest.fn().mockResolvedValue([]),
              createMany: jest.fn().mockResolvedValue({}),
              create: jest.fn().mockResolvedValue({}),
              deleteMany: jest.fn().mockResolvedValue({}),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb({ casbinRule: {} })),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaAdapterService>(PrismaAdapterService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load policies into the Casbin model', async () => {
    const model = {
      model: new Map(),
    };
    await service.loadPolicy(model as any);
    expect(prismaService.casbinRule.findMany).toHaveBeenCalled();
  });

  it('should save policies to the database', async () => {
    const model = {
      model: new Map([
        ['p', new Map([['p', { policy: [['user', 'resource', 'manage']] }]])],
      ]),
    };
    await service.savePolicy(model as any);

    // Ensure deleteMany is always called to clear policies first
    expect(prismaService.casbinRule.deleteMany).toHaveBeenCalled();

    // Ensure createMany is called only if policies exist
    if (model.model.get('p')) {
      expect(prismaService.casbinRule.createMany).toHaveBeenCalled();
    }
  });

  it('should add a policy to the database', async () => {
    const sec = 'p';
    const ptype = 'p';
    const rule = ['user', 'resource', 'read'];

    await service.addPolicy(sec, ptype, rule);

    expect(prismaService.casbinRule.create).toHaveBeenCalledWith({
      data: {
        ptype,
        v0: rule[0],
        v1: rule[1],
        v2: rule[2],
        v3: null,
        v4: null,
        v5: null,
      },
    });
  });

  it('should remove a policy from the database', async () => {
    const sec = 'p';
    const ptype = 'p';
    const rule = ['user', 'resource', 'read'];

    await service.removePolicy(sec, ptype, rule);

    expect(prismaService.casbinRule.deleteMany).toHaveBeenCalledWith({
      where: {
        ptype,
        v0: rule[0],
        v1: rule[1],
        v2: rule[2],
        v3: undefined,
        v4: undefined,
        v5: undefined,
      },
    });
  });

  it('should remove filtered policies from the database', async () => {
    const sec = 'p';
    const ptype = 'p';
    const fieldIndex = 1;
    const fieldValues = ['resource', 'read'];

    await service.removeFilteredPolicy(sec, ptype, fieldIndex, ...fieldValues);

    expect(prismaService.casbinRule.deleteMany).toHaveBeenCalledWith({
      where: {
        ptype,
        v1: 'resource',
        v2: 'read',
      },
    });
  });
});