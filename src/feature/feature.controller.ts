import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  DefaultValuePipe,
} from '@nestjs/common';
import { FeatureService } from './feature.service';
import { CreateFeatureInput } from '@feature-dto/create-feature.input';
import { MaxTakePipe } from '../pipes/max-take/max-take.pipe';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UpdateFeatureInput } from '@feature-dto/update-feature.input';

@ApiTags('Features')
@Controller('features')
export class FeatureController {
  private readonly logger = new Logger(FeatureController.name);

  constructor(
    private readonly featureService: FeatureService,
    private readonly casbinHelperService: CasbinHelperService,
  ) {}

  // Create a single feature
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({
    status: 201,
    description: 'The feature has been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for feature creation.',
  })
  async createFeature(
    @Body() createFeatureInput: CreateFeatureInput,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/create',
      'create',
      tenantId,
    );

    this.logger.log(`Creating feature for tenant ${tenantId}`);
    return this.featureService.create(
      createFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Bulk create multiple features
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create features' })
  @ApiResponse({
    status: 201,
    description: 'The features have been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for bulk feature creation.',
  })
  async bulkCreateFeatures(
    @Body() createFeatureInputs: CreateFeatureInput[],
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk',
      'create',
      tenantId,
    );

    this.logger.log(`Bulk creating features for tenant ${tenantId}`);
    return this.featureService.bulkCreate(
      createFeatureInputs,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Get a single feature by ID
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a feature by ID' })
  @ApiResponse({ status: 200, description: 'Feature retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Feature not found.' })
  @ApiBadRequestResponse({ description: 'Invalid feature ID.' })
  async getFeatureById(
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/${id}`,
      'read',
      tenantId,
    );

    this.logger.log(`Retrieving feature with ID ${id} for tenant ${tenantId}`);
    return this.featureService.getFeatureById(id, tenantId);
  }

  // Update a feature by ID
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a feature by ID' })
  @ApiResponse({ status: 200, description: 'Feature updated successfully.' })
  @ApiNotFoundResponse({ description: 'Feature not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid input data for feature update.',
  })
  async updateFeature(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFeatureInput: UpdateFeatureInput,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/update`,
      'update',
      tenantId,
    );

    this.logger.log(`Updating feature with ID ${id} for tenant ${tenantId}`);

    return this.featureService.update(
      id,
      updateFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Get all features with pagination and optional filters
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all active features' })
  @ApiResponse({ status: 200, description: 'List of active features.' })
  async findAllFeatures(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100))
    take: number,
    @Query('name') name?: string,
    @Query('tierId', ParseIntPipe) tierId?: number,
    @Query('isPremium') isPremium?: boolean,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features',
      'read',
      tenantId,
    );

    this.logger.log(`Listing features for tenant ${tenantId}`);
    return this.featureService.findAllWithPagination(
      tenantId,
      { name, tierId, isPremium },
      skip,
      take,
    );
  }

  // Soft delete a feature
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a feature (recycle bin)' })
  @ApiResponse({
    status: 204,
    description: 'The feature has been successfully soft-deleted.',
  })
  @ApiNotFoundResponse({ description: 'Feature not found.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/${id}`,
      'delete',
      tenantId,
    );

    this.logger.log(
      `Soft deleting feature with ID ${id} for tenant ${tenantId}`,
    );
    await this.featureService.remove(
      id,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Bulk soft delete features
  @Delete('bulk-remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk soft delete features' })
  @ApiResponse({
    status: 204,
    description: 'The features have been successfully soft deleted.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for bulk feature deletion.',
  })
  async bulkRemoveFeatures(
    @Body('featureIds') featureIds: number[],
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-remove',
      'delete',
      tenantId,
    );

    this.logger.log(`Bulk soft deleting features for tenant ${tenantId}`);
    return this.featureService.bulkRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Get all soft-deleted features (recycle bin) with pagination
  @Get('recycle-bin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all soft-deleted features (recycle bin)' })
  @ApiResponse({ status: 200, description: 'List of soft-deleted features.' })
  async findAllDeletedFeatures(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100))
    take: number,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/recycle-bin',
      'read',
      tenantId,
    );

    this.logger.log(`Listing soft-deleted features for tenant ${tenantId}`);
    return this.featureService.findAllDeletedWithPagination(
      tenantId,
      skip,
      take,
    );
  }

  // Restore a soft-deleted feature from the recycle bin
  @Patch('restore/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted feature' })
  @ApiResponse({ status: 200, description: 'Feature restored successfully.' })
  @ApiNotFoundResponse({ description: 'Feature not found in recycle bin.' })
  async restoreFeature(
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/restore/${id}`,
      'restore',
      tenantId,
    );

    this.logger.log(`Restoring feature with ID ${id} for tenant ${tenantId}`);
    return this.featureService.restore(
      id,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Bulk restore features
  @Patch('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk restore soft-deleted features' })
  @ApiResponse({ status: 200, description: 'Features restored successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid input data for bulk restore.',
  })
  @ApiNotFoundResponse({
    description: 'One or more features not found in recycle bin.',
  })
  async bulkRestoreFeatures(
    @Body('featureIds') featureIds: number[],
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-restore',
      'restore',
      tenantId,
    );

    this.logger.log(`Bulk restoring features for tenant ${tenantId}`);
    return this.featureService.bulkRestore(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Permanently delete a feature
  @Delete('hard-remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a feature' })
  @ApiResponse({ status: 204, description: 'Feature permanently deleted.' })
  @ApiNotFoundResponse({ description: 'Feature not found.' })
  async hardRemoveFeature(
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/hard-remove/${id}`,
      'delete',
      tenantId,
    );

    this.logger.log(
      `Permanently deleting feature with ID ${id} for tenant ${tenantId}`,
    );
    await this.featureService.hardRemove(
      id,
      tenantId,
      userId,
      '127.0.0.1',
      'system',
    );
  }

  // Bulk permanently delete features
  @Delete('bulk-hard-remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk permanently delete features' })
  @ApiResponse({ status: 204, description: 'Features permanently deleted.' })
  @ApiNotFoundResponse({ description: 'One or more features not found.' })
  async bulkHardRemoveFeatures(
    @Body('featureIds') featureIds: number[],
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('ipAddress') ipAddress: string,
    @Query('userAgent') userAgent: string,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-hard-remove',
      'delete',
      tenantId,
    );

    this.logger.log(
      `Bulk permanently deleting features for tenant ${tenantId}`,
    );
    await this.featureService.bulkHardRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  // Toggle feature status (enable/disable)
  @Patch('toggle-status/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle the feature status (enable/disable)' })
  @ApiResponse({
    status: 200,
    description: 'Feature status toggled successfully.',
  })
  @ApiNotFoundResponse({ description: 'Feature not found.' })
  @ApiBadRequestResponse({ description: 'Invalid feature ID or tenant ID.' })
  async toggleFeatureStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/toggle-status/${id}`,
      'update',
      tenantId,
    );

    this.logger.log(
      `Toggling feature status for feature ID ${id} and tenant ID ${tenantId}`,
    );
    return this.featureService.toggleFeatureStatus(id, tenantId);
  }

  // List all features for a tenant with pagination
  @Get()
  async listFeatures(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query(
      'take',
      new DefaultValuePipe(10),
      ParseIntPipe,
      new MaxTakePipe(1000),
    )
    take: number, // Make sure this is enforced
  ) {
    return this.featureService.listFeatures(tenantId, skip, take);
  }

  // Get all soft-deleted features with pagination
  @Get('recycle-bin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all soft-deleted features (recycle bin)' })
  @ApiResponse({ status: 200, description: 'List of soft-deleted features.' })
  @ApiBadRequestResponse({
    description: 'Invalid input data for retrieving soft-deleted features.',
  })
  async findAllDeleted(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query(
      'take',
      new DefaultValuePipe(10),
      ParseIntPipe,
      new MaxTakePipe(1000),
    )
    take: number,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/recycle-bin',
      'read',
      tenantId,
    );

    this.logger.log(`Listing soft-deleted features for tenant ${tenantId}`);

    return this.featureService.findAllDeleted(tenantId, skip, take);
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all active features' })
  @ApiResponse({ status: 200, description: 'List of active features' })
  async findAllActive(
    @Query('tenantId', ParseIntPipe) tenantId: number,
    @Query('userId', ParseIntPipe) userId: number,
    @Query('name') name?: string,
    @Query('tierId', ParseIntPipe) tierId?: number,
    @Query('isPremium', new DefaultValuePipe(false)) isPremium?: boolean,
  ) {
    // Casbin authorization
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/active',
      'read',
      tenantId,
    );

    this.logger.log(`Listing active features for tenant ${tenantId}`);

    return this.featureService.findAll(tenantId, name, tierId, isPremium);
  }
}
