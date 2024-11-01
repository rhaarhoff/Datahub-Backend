import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggingInterceptor } from './audit-logging.interceptor';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../../audit/audit.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { AuditAction } from '../../../audit/interfaces/audit-action.enum';
import { Request } from 'express';

describe('AuditLoggingInterceptor', () => {
  let interceptor: AuditLoggingInterceptor;
  let reflector: Reflector;
  let auditService: AuditService;

  const mockRequest = {
    body: { userId: 1, tenantId: 1, featureId: 1 },
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('user-agent-string'),
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggingInterceptor,
        Reflector,
        {
          provide: AuditService,
          useValue: { logAction: jest.fn() },
        },
      ],
    }).compile();

    interceptor = module.get<AuditLoggingInterceptor>(AuditLoggingInterceptor);
    reflector = module.get<Reflector>(Reflector);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockExecutionContext(): ExecutionContext {
    return {
      switchToHttp: jest.fn(() => ({
        getRequest: () => mockRequest,
      })),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('LOG-INT-AuditLogging-BasicInvocation-01: should log with DEFAULT action if no metadata is present', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => of('response') };
  
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
  
    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.DEFAULT,
      userId: 1,
      tenantId: 1,
      featureId: 1,
      before: null,
      after: 'response',
      ipAddress: '127.0.0.1',
      userAgent: 'user-agent-string',
    });
  });
  

  it('LOG-INT-AuditLogging-LogOnSuccess-02: should log action on successful request', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => of('response') };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.CREATE_TENANT_PERMISSION);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.CREATE_TENANT_PERMISSION,
      userId: 1,
      tenantId: 1,
      featureId: 1,
      before: null,
      after: 'response',
      ipAddress: '127.0.0.1',
      userAgent: 'user-agent-string',
    });
  });

  it('LOG-INT-AuditLogging-LogOnError-03: should log action on error and propagate error', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => throwError(() => new Error('Test error')) };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.DELETE_TENANT_PERMISSION);

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error');
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.DELETE_TENANT_PERMISSION,
      userId: 1,
      tenantId: 1,
      featureId: 1,
      before: null,
      after: null,
      ipAddress: '127.0.0.1',
      userAgent: 'user-agent-string',
    });
  });

  it('LOG-INT-AuditLogging-MissingMetadata-04: should handle missing userId, tenantId, or featureId gracefully', async () => {
    const context = createMockExecutionContext();
    mockRequest.body = {}; // No userId, tenantId, featureId
    const next: CallHandler = { handle: () => of('response') };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.ACCESS_TENANT_PERMISSION);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith({
      action: AuditAction.ACCESS_TENANT_PERMISSION,
      userId: undefined,
      tenantId: undefined,
      featureId: undefined,
      before: null,
      after: 'response',
      ipAddress: '127.0.0.1',
      userAgent: 'user-agent-string',
    });
  });

  it('LOG-INT-AuditLogging-RetrieveAction-05: should retrieve correct AuditAction metadata', () => {
    const context = createMockExecutionContext();
    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.UPDATE_TENANT_PERMISSION);

    const action = interceptor['determineAuditAction'](context);
    expect(action).toBe(AuditAction.UPDATE_TENANT_PERMISSION);
  });

  it('LOG-INT-AuditLogging-LogUserAgent-06: should log user agent correctly', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => of('response') };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.CREATE_TENANT_PERMISSION);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: 'user-agent-string',
      }),
    );
  });

  it('LOG-INT-AuditLogging-IPCapture-07: should capture and log IP address', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => of('response') };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.UPDATE_TENANT_PERMISSION);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('LOG-INT-AuditLogging-ReflectorUsage-10: should use Reflector to retrieve metadata', async () => {
    const context = createMockExecutionContext();
    const reflectorSpy = jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.DEFAULT);

    const action = interceptor['determineAuditAction'](context);
    expect(reflectorSpy).toHaveBeenCalledWith('auditAction', context.getHandler());
    expect(action).toBe(AuditAction.DEFAULT);
  });

  it('LOG-INT-AuditLogging-DefaultAction-11: should use default action if no metadata is provided', () => {
    const context = createMockExecutionContext();
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    const action = interceptor['determineAuditAction'](context);
    expect(action).toBe(AuditAction.DEFAULT);
  });

  it('LOG-INT-AuditLogging-LogBeforeAfter-12: should log before and after states correctly', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => of('response') };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.CREATE_TENANT_PERMISSION);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        before: null,
        after: 'response',
      }),
    );
  });

  it('LOG-INT-AuditLogging-LogErrorHandling-13: should log error state with before and after as null', async () => {
    const context = createMockExecutionContext();
    const next: CallHandler = { handle: () => throwError(() => new Error('Test error')) };

    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.DELETE_TENANT_PERMISSION);

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error');
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        before: null,
        after: null,
      }),
    );
  });
});
