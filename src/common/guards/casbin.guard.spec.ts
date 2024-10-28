import { Test, TestingModule } from '@nestjs/testing';
import { CasbinGuard } from './casbin.guard';
import { CasbinService } from '@casbin-integration/casbin.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('CasbinGuard', () => {
  let guard: CasbinGuard;
  let casbinService: CasbinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasbinGuard,
        {
          provide: CasbinService,
          useValue: {
            enforce: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    guard = module.get<CasbinGuard>(CasbinGuard);
    casbinService = module.get<CasbinService>(CasbinService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if policy is enforced', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'user-id',
            tenantId: 'tenant-id',
            subscriptionPlan: 'premium',
          },
          route: { path: '/resource' },
          method: 'GET',
          headers: {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'Mozilla/5.0',
          },
          connection: { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
    expect(casbinService.enforce).toHaveBeenCalledWith(
      'user-id',
      '/resource',
      'get',
      'tenant-id',
      'premium',
      true,
      expect.any(String), // currentDate
      '127.0.0.1', // location
      'Mozilla/5.0' // deviceType
    );
  });

  it('should deny access if policy is not enforced', async () => {
    (casbinService.enforce as jest.Mock).mockResolvedValue(false);

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'user-id',
            tenantId: 'tenant-id',
            subscriptionPlan: 'premium',
          },
          route: { path: '/resource' },
          method: 'GET',
          headers: {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'Mozilla/5.0',
          },
          connection: { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    expect(casbinService.enforce).toHaveBeenCalledWith(
      'user-id',
      '/resource',
      'get',
      'tenant-id',
      'premium',
      true,
      expect.any(String), // currentDate
      '127.0.0.1', // location
      'Mozilla/5.0' // deviceType
    );
  });
});