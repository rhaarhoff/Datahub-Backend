import {
  Controller,
  Patch,
  Get,
  Param,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { TenantFeatureService } from './tenant-feature.service';
import { UpdateTenantFeatureDto } from './dto/update-tenant-feature.dto';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TenantFeatureResponseDto } from './dto/tenant-feature-response.dto';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service'; // Import Casbin Helper Service
import { Request } from 'express'; // Import Request from express

@ApiTags('Tenant Features')
@Controller('tenant-features')
@UsePipes(new ValidationPipe({ transform: true }))
export class TenantFeatureController {
  private readonly logger = new Logger(TenantFeatureController.name);

  constructor(
    private readonly tenantFeatureService: TenantFeatureService,
    private readonly casbinHelperService: CasbinHelperService, // Inject Casbin Helper Service
  ) {}

  // Endpoint to update tenant features for a given tenantId
  @Patch(':tenantId/update')
  @ApiOperation({ summary: 'Update tenant features for a given tenantId' })
  @ApiParam({
    name: 'tenantId',
    type: String,
    description: 'The ID of the tenant to update features for',
    example: '101',
  })
  @ApiBody({
    type: UpdateTenantFeatureDto,
    description: 'Data required to update tenant features',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant features updated successfully',
    type: String,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid tenant ID or input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateTenantFeatures(
    @Param('tenantId') tenantId: number,
    @Body() updateTenantFeaturesDto: UpdateTenantFeatureDto,
    @Req() req: Request, // Extract the user info from the request
  ): Promise<string> {
    try {
      const userId = req.user['id']; // Assuming userId is available in req.user

      // Use CasbinHelperService to authorize this action (enforce RBAC/ABAC policies)
      await this.casbinHelperService.enforceAuthorization(
        userId,
        '/tenant-features/update', // Resource being accessed
        'update', // Action being performed
        tenantId, // Tenant context
      );

      // Proceed with updating the tenant features after authorization passes
      return await this.tenantFeatureService.updateTenantFeatures(
        tenantId,
        updateTenantFeaturesDto.newPlanId,
        userId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update features for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Endpoint to get features of a tenant by tenantId
  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant features by tenantId' })
  @ApiParam({
    name: 'tenantId',
    type: String,
    description: 'The ID of the tenant whose features are to be retrieved',
      example: '101',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenant features',
    type: [TenantFeatureResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid tenant ID',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getTenantFeatures(
    @Param('tenantId') tenantId: number,
    @Req() req: Request, // Extract the user info from the request
  ): Promise<TenantFeatureResponseDto[]> {
    try {
      const userId = req.user['id'];

      // Use CasbinHelperService to authorize this action (enforce RBAC/ABAC policies)
      await this.casbinHelperService.enforceAuthorization(
        userId,
        '/tenant-features/get', // Resource being accessed
        'read', // Action being performed
        tenantId, // Tenant context
      );

      return await this.tenantFeatureService.getTenantFeatures(tenantId);
    } catch (error) {
      this.logger.error(
        `Failed to get features for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }
}
