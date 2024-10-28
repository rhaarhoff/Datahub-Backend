import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Optional: You can override canActivate if you need custom behavior
  canActivate(context: ExecutionContext) {
    // You can add custom logic before invoking the parent method
    return super.canActivate(context); // Calls the parent method to ensure JWT validation
  }

  // Override handleRequest to handle the response after authentication
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // If there's an error or no user is found, throw UnauthorizedException
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user; // Return the authenticated user to be injected into the request
  }
}
