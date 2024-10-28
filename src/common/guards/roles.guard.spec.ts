import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    Logger: {
      ...originalModule.Logger,
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-id', roles: ['admin'] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockExecutionContext)).toBe(true);
  });

  it('should allow access if user has required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-id', roles: ['admin'] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockExecutionContext)).toBe(true);
  });

  it('should deny access if user does not have required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-id', roles: ['user'] } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    expect(Logger.warn).toHaveBeenCalledWith(
      'Access denied for user user-id with roles [user]. Required roles: [admin]'
    );
  });

  it('should throw ForbiddenException if user cannot be extracted from context', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const mockExecutionContext = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    expect(Logger.error).toHaveBeenCalledWith('Unable to extract user from context');
  });

  it('should extract user from GraphQL context', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const mockExecutionContext = {
      getType: () => 'graphql',
    } as unknown as ExecutionContext;

    const gqlContext = {
      getContext: () => ({ req: { user: { id: 'user-id', roles: ['admin'] } } }),
    };
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(gqlContext as any);

    expect(guard.canActivate(mockExecutionContext)).toBe(true);
  });
});
