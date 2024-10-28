import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { AuditLogNotFoundException } from '../common/exceptions/audit-log-not-found.exception';
import { InvalidDateRangeException } from '../common/exceptions/invalid-date-range.exception';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LogActionParams } from './interfaces/log-action.interface';
import { AuditAction } from './interfaces/audit-action.enum';

describe('AuditService', () => {
  let auditService: AuditService;
  let prismaService: PrismaService;

  const mockAuditLog = {
    id: 1,
    action: AuditAction.CREATE_FEATURE,
    userId: 1,
    tenantId: 1,
    featureId: 1,
    timestamp: new Date(),
  };

  const mockPrismaService = {
    auditLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks(); // Reset mock state and implementation between tests

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(auditService).toBeDefined();
  });

  describe('findOne', () => {
    it('should return an audit log by ID', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockAuditLog);
      const result = await auditService.findOne(1);
      expect(result).toEqual(mockAuditLog);
      expect(prismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true, tenant: true, feature: true },
      });
    });

    it('should throw AuditLogNotFoundException if audit log not found', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);
      await expect(auditService.findOne(1)).rejects.toThrow(
        AuditLogNotFoundException,
      );
    });

    it('should throw InternalServerErrorException on Prisma error', async () => {
      mockPrismaService.auditLog.findUnique.mockRejectedValue(new Error());
      await expect(auditService.findOne(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('logAction', () => {
    const logParams: LogActionParams = {
      action: AuditAction.CREATE_FEATURE,
      userId: 1,
      tenantId: 1,
      featureId: 1,
      before: null,
      after: { name: 'New Feature' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla',
    };

    it('should create an audit log successfully', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);
      const result = await auditService.logAction(logParams);
      expect(result).toBeUndefined();
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: AuditAction.CREATE_FEATURE,
          userId: 1,
          tenantId: 1,
          featureId: 1,
          before: null,
          after: JSON.stringify({ name: 'New Feature' }),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          modifiedFields: null,
        },
      });
    });

    it('should throw BadRequestException if action or userId is missing', async () => {
      const invalidParams = {
        action: null,
        userId: null,
      } as unknown as LogActionParams;
      await expect(auditService.logAction(invalidParams)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invalid action is provided', async () => {
      const invalidParams = {
        action: 'INVALID_ACTION',
        userId: 1,
      } as unknown as LogActionParams;

      await expect(auditService.logAction(invalidParams)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on Prisma error', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error());
      await expect(auditService.logAction(logParams)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs with total count', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await auditService.findAll(0, 10, 'desc');
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: { user: true, tenant: true, feature: true },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      expect(prismaService.auditLog.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should apply filters correctly', async () => {
      const filter = { action: AuditAction.CREATE_FEATURE, userId: 1 };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await auditService.findAll(0, 10, 'desc', filter);
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: AuditAction.CREATE_FEATURE, userId: 1 },
        include: { user: true, tenant: true, feature: true },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      expect(prismaService.auditLog.count).toHaveBeenCalledWith({
        where: { action: AuditAction.CREATE_FEATURE, userId: 1 },
      });
    });

    it('should throw InvalidDateRangeException if startDate is after endDate', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2023-01-01');

      await expect(
        auditService.findAll(0, 10, 'desc', { startDate, endDate }),
      ).rejects.toThrow(InvalidDateRangeException);
    });
  });

  describe('buildWhereClause', () => {
    it('should throw InvalidDateRangeException if startDate is after endDate', () => {
      const filter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2023-01-01'),
      };
      expect(() => auditService['buildWhereClause'](filter)).toThrow(
        InvalidDateRangeException,
      );
    });

    it('should return correct where clause with filters', () => {
      const filter = {
        action: AuditAction.CREATE_FEATURE,
        userId: 1,
        startDate: new Date('2023-01-01'),
      };
      const whereClause = auditService['buildWhereClause'](filter);
      expect(whereClause).toEqual({
        action: AuditAction.CREATE_FEATURE,
        userId: 1,
        timestamp: { gte: new Date('2023-01-01') },
      });
    });
  });

  it('should return audit logs filtered by date range', async () => {
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');

    mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
    mockPrismaService.auditLog.count.mockResolvedValue(1);

    const result = await auditService.findAll(0, 10, 'desc', {
      startDate,
      endDate,
    });

    expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
      where: { timestamp: { gte: startDate, lte: endDate } },
      include: { user: true, tenant: true, feature: true },
      skip: 0,
      take: 10,
      orderBy: { timestamp: 'desc' },
    });
  });

  it('should return empty results if no audit logs are found', async () => {
    mockPrismaService.auditLog.findMany.mockResolvedValue([]);
    mockPrismaService.auditLog.count.mockResolvedValue(0);

    const result = await auditService.findAll(0, 10, 'desc');

    expect(result).toEqual({ total: 0, logs: [] });
    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
      where: {},
      include: { user: true, tenant: true, feature: true },
      skip: 0,
      take: 10,
      orderBy: { timestamp: 'desc' },
    });
  });

  it('should return audit logs for a specific tenant', async () => {
    mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
    mockPrismaService.auditLog.count.mockResolvedValue(1);

    const result = await auditService.findByTenant(1, 0, 10, 'desc');

    expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: 1 },
      include: { user: true, tenant: true, feature: true },
      skip: 0,
      take: 10,
      orderBy: { timestamp: 'desc' },
    });
  });

  it('should limit the take value to maxTake', async () => {
    const maxTake = auditService['maxTake']; // Access the private maxTake variable
    await auditService.findAll(0, 1000, 'desc'); // Intentionally using a high value

    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
      where: {},
      include: { user: true, tenant: true, feature: true },
      skip: 0,
      take: maxTake,
      orderBy: { timestamp: 'desc' },
    });
  });

  describe('batchLogActions', () => {
    const validActions: LogActionParams[] = [
      {
        action: AuditAction.CREATE_FEATURE,
        userId: 1,
        tenantId: 1,
        featureId: 1,
        before: null,
        after: { name: 'New Feature' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
      },
      {
        action: AuditAction.UPDATE_FEATURE,
        userId: 1,
        tenantId: 1,
        featureId: 2,
        before: { name: 'Old Feature' },
        after: { name: 'Updated Feature' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
      },
    ];

    const invalidActions: LogActionParams[] = [
      {
        action: 'INVALID_ACTION',
        userId: 1,
        tenantId: 1,
        featureId: 1,
        before: null,
        after: { name: 'New Feature' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
      },
    ] as unknown as LogActionParams[];

    it('should batch log valid actions successfully', async () => {
      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 2 });
      await auditService.batchLogActions(validActions);

      expect(prismaService.auditLog.createMany).toHaveBeenCalledWith({
        data: validActions.map((action) => ({
          action: action.action,
          userId: action.userId,
          tenantId: action.tenantId,
          featureId: action.featureId,
          before: action.before ? JSON.stringify(action.before) : null,
          after: action.after ? JSON.stringify(action.after) : null,
          ipAddress: action.ipAddress || 'Unknown IP',
          userAgent: action.userAgent || 'Unknown Agent',
        })),
        skipDuplicates: true,
      });
      expect(prismaService.auditLog.createMany).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if no actions are provided', async () => {
      await expect(auditService.batchLogActions([])).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.auditLog.createMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if invalid actions are provided', async () => {
      await expect(
        auditService.batchLogActions(invalidActions),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.auditLog.createMany).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on Prisma error', async () => {
      mockPrismaService.auditLog.createMany.mockRejectedValue(new Error());
      await expect(auditService.batchLogActions(validActions)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
