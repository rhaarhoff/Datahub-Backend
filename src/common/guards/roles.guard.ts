import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from metadata (handler and class level)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const user = this.getUserFromContext(context);

    if (!user) {
      this.logger.error('Unable to extract user from context');
      throw new ForbiddenException('Unauthorized access');
    }

    const userRoles = user.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.id || 'unknown'} with roles [${userRoles.join(', ')}]. Required roles: [${requiredRoles.join(', ')}]`
      );
      throw new ForbiddenException(`Access denied. Required roles: [${requiredRoles.join(', ')}]`);
    }

    return true;
  }

  /**
   * Extracts user from GraphQL or HTTP context.
   */
  private getUserFromContext(context: ExecutionContext) {
    const contextType = context.getType<string>(); // Instead of using ContextType, we cast it to string.

    // Check if the context is GraphQL
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req.user;
    }

    // Check if the context is HTTP
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user;
    }

    return null;
  }
}
