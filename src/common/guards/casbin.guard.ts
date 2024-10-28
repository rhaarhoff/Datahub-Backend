import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CasbinService } from '@casbin-integration/casbin.service';

@Injectable()
export class CasbinGuard implements CanActivate {
  constructor(private readonly casbinService: CasbinService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user.tenantId;
    const subPlan = user.subscriptionPlan;
    const featureEnabled = await this.getFeatureEnabled(request);
    const currentDate = new Date();
    const location = this.getUserLocation(request);
    const deviceType = this.getDeviceType(request);
    const resource = request.route.path;
    const action = request.method.toLowerCase();

    // Convert non-string arguments to strings
    const result = await this.casbinService.enforce(
      user.id,
      resource,
      action,
      tenantId,
      subPlan,
      featureEnabled.toString(),  // Convert boolean to string
      currentDate.toISOString(),  // Use ISO string format for date
      location, // IP address
      deviceType // User agent
    );

    if (!result) {
      throw new ForbiddenException('Access Denied');
    }

    // Attach IP address and User-Agent to the request for logging
    request.auditInfo = {
      ipAddress: location,
      userAgent: deviceType,
    };

    return result;
  }

  // Logic to determine if a feature is enabled for the user
  private async getFeatureEnabled(request): Promise<boolean> {
    // Implement logic to determine if feature is enabled
    return true;  // Simulated feature flag check
  }

  // Logic to determine the user's location
  private getUserLocation(request): string {
    return request.headers['x-forwarded-for'] || request.connection.remoteAddress;
  }

  // Logic to determine the user's device type
  private getDeviceType(request): string {
    return request.headers['user-agent'];
  }
}
