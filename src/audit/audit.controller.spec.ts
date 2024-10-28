import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './interfaces/audit-log.interface';

describe('AuditController', () => {
  let auditController: AuditController;
  let auditService: AuditService;

  const mockAuditLog: AuditLog = {
    id: 1,
    action: 'CREATE_FEATURE',
    timestamp: new Date(),
    before: null,
    after: JSON.stringify({ name: 'New Feature' }),
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla',
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    },
    tenant: {
      id: 1,
      name: 'Test Tenant',
      domain: 'testtenant.com',
      status: 'ACTIVE',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(),
      complianceLevel: 'GDPR',
      currentUsage: 100,
      usageQuota: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    feature: {
      id: 1,
      name: 'Test Feature',
      description: 'A test feature',
      isPremium: false,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockAuditService = {
    findAll: jest.fn().mockResolvedValue({ total: 1, logs: [mockAuditLog] }),
    findOne: jest.fn().mockResolvedValue(mockAuditLog),
    findLogsByEntity: jest.fn().mockResolvedValue({ total: 1, logs: [mockAuditLog] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    auditController = module.get<AuditController>(AuditController);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(auditController).toBeDefined();
  });

  describe('getAllLogs', () => {
    it('should return a list of audit logs', async () => {
      const result = await auditController.getAllLogs(0, 10);
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(auditService.findAll).toHaveBeenCalledWith(0, 10);
    });
  });

  describe('getAuditLog', () => {
    it('should return a single audit log by ID', async () => {
      const result = await auditController.getAuditLog(1);
      expect(result).toEqual(mockAuditLog);
      expect(auditService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('getLogsByTenant', () => {
    it('should return a list of audit logs for a specific tenant', async () => {
      const result = await auditController.getLogsByTenant(1, 0, 10);
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(auditService.findLogsByEntity).toHaveBeenCalledWith('tenantId', 1, 0, 10);
    });
  });

  describe('getLogsByFeature', () => {
    it('should return a list of audit logs for a specific feature', async () => {
      const result = await auditController.getLogsByFeature(1, 0, 10);
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(auditService.findLogsByEntity).toHaveBeenCalledWith('featureId', 1, 0, 10);
    });
  });

  describe('getLogsByUser', () => {
    it('should return a list of audit logs for a specific user', async () => {
      const result = await auditController.getLogsByUser(1, 0, 10);
      expect(result).toEqual({ total: 1, logs: [mockAuditLog] });
      expect(auditService.findLogsByEntity).toHaveBeenCalledWith('userId', 1, 0, 10);
    });
  });
});
