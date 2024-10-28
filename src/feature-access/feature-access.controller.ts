import { Controller, Post, Param, Logger } from '@nestjs/common';
import { FeatureAccessService } from './feature-access.service';
import { ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Feature Access')
@Controller('feature-access')
export class FeatureAccessController {
  private readonly logger = new Logger(FeatureAccessController.name);

  constructor(private readonly featureAccessService: FeatureAccessService) {}

  @Post('update/:tenantId')
  @ApiParam({ name: 'tenantId', description: 'The ID of the tenant', example: 101 })
  @ApiResponse({ status: 200, description: 'Feature access updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid tenant ID' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateFeatureAccess(@Param('tenantId') tenantId: number): Promise<string> {
    try {
      await this.featureAccessService.updateFeatureAccessForRoles(tenantId);
      return `Feature access updated successfully for tenant ${tenantId}`;
    } catch (error) {
      this.logger.error(`Failed to update feature access for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }
}
