import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { FeatureService } from './feature.service';
import { Feature } from '../feature-access/models/feature-access.model';
import { CreateFeatureInput } from './dto/create-feature.input';
import { UpdateFeatureInput } from './dto/update-feature.input';
import { Roles } from '../common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';

@Resolver(() => Feature)
@UseGuards(RolesGuard)
export class FeatureResolver {
  constructor(
    private readonly featureService: FeatureService,
    private readonly casbinHelperService: CasbinHelperService, // Include CasbinHelperService for authorization
  ) {}

  @Query(() => [Feature], { description: 'Retrieve all features for a tenant with pagination' })
  @Roles('ADMIN', 'SUPERADMIN')
  async listFeatures(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(userId, '/features', 'read', tenantId);

    // Call service to fetch the features with pagination
    return this.featureService.listFeatures(tenantId, skip, take);
  }

  @Query(() => [Feature], { description: 'Retrieve all active features for a tenant' })
  @Roles('ADMIN', 'SUPERADMIN')
  async findAll(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('name', { type: () => String, nullable: true }) name?: string,
    @Args('tierId', { type: () => Int, nullable: true }) tierId?: number,
    @Args('isPremium', { type: () => Boolean, nullable: true }) isPremium?: boolean,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(userId, '/features', 'read', tenantId);

    return this.featureService.findAll(tenantId, name, tierId, isPremium);
  }

  @Query(() => Feature, { description: 'Retrieve a feature by ID' })
  @Roles('ADMIN', 'SUPERADMIN')
  async getFeatureById(
    @Args('id', { type: () => Int }) id: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('includeDeleted', { type: () => Boolean, defaultValue: false }) includeDeleted: boolean,
    @Args('userId', { type: () => Int }) userId: number,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(userId, `/features/${id}`, 'read', tenantId);

    return this.featureService.getFeatureById(id, tenantId, includeDeleted);
  }

  @Mutation(() => Feature, { description: 'Create a new feature' })
  @Roles('ADMIN', 'SUPERADMIN')
  async createFeature(
    @Args('createFeatureInput') createFeatureInput: CreateFeatureInput,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/create',
      'create',
      tenantId,
    );

    return this.featureService.create(
      createFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => [Feature], { description: 'Bulk create features' })
  @Roles('ADMIN', 'SUPERADMIN')
  async bulkCreateFeatures(
    @Args({ name: 'createFeatureInputs', type: () => [CreateFeatureInput] })
    createFeatureInputs: CreateFeatureInput[],
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(userId, '/features/bulk-create', 'create', tenantId);

    return this.featureService.bulkCreate(
      createFeatureInputs,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Feature, { description: 'Update a feature' })
  @Roles('ADMIN', 'SUPERADMIN')
  async updateFeature(
    @Args('id', { type: () => Int }) id: number,
    @Args('updateFeatureInput') updateFeatureInput: UpdateFeatureInput,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/update/${id}`,
      'update',
      tenantId,
    );

    return this.featureService.update(
      id,
      updateFeatureInput,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Feature, { description: 'Soft delete a feature' })
  @Roles('ADMIN', 'SUPERADMIN')
  async removeFeature(
    @Args('id', { type: () => Int }) id: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/remove/${id}`,
      'delete',
      tenantId,
    );

    return this.featureService.remove(
      id,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Boolean, { description: 'Bulk soft delete features' })
  @Roles('ADMIN', 'SUPERADMIN')
  async bulkRemoveFeatures(
    @Args('featureIds', { type: () => [Int] }) featureIds: number[],
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress', { type: () => String }) ipAddress: string,
    @Args('userAgent', { type: () => String }) userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-remove',
      'delete',
      tenantId,
    );

    const { success, errors } = await this.featureService.bulkRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    if (errors.length > 0) {
      throw new Error(
        `Bulk remove encountered errors: ${errors.length} failed.`,
      );
    }

    return success.length > 0;
  }

  @Mutation(() => Feature, { description: 'Restore a soft-deleted feature' })
  @Roles('ADMIN', 'SUPERADMIN')
  async restoreFeature(
    @Args('id', { type: () => Int }) id: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/restore/${id}`,
      'restore',
      tenantId,
    );

    return this.featureService.restore(
      id,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Boolean, { description: 'Bulk restore features' })
  @Roles('ADMIN', 'SUPERADMIN')
  async bulkRestoreFeatures(
    @Args('featureIds', { type: () => [Int] }) featureIds: number[],
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress', { type: () => String }) ipAddress: string,
    @Args('userAgent', { type: () => String }) userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-restore',
      'restore',
      tenantId,
    );

    const restoredFeatures = await this.featureService.bulkRestore(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    return restoredFeatures.length > 0;
  }

  @Mutation(() => Feature, { description: 'Permanently delete a feature' })
  @Roles('ADMIN', 'SUPERADMIN')
  async hardRemoveFeature(
    @Args('id', { type: () => Int }) id: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress', { type: () => String, defaultValue: '127.0.0.1' })
    ipAddress: string,
    @Args('userAgent', { type: () => String, defaultValue: 'system' })
    userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      `/features/hard-remove/${id}`,
      'delete',
      tenantId,
    );

    return this.featureService.hardRemove(
      id,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Boolean, { description: 'Bulk permanently delete features' })
  @Roles('ADMIN', 'SUPERADMIN')
  async bulkHardRemoveFeatures(
    @Args('featureIds', { type: () => [Int] }) featureIds: number[],
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('ipAddress') ipAddress: string,
    @Args('userAgent') userAgent: string,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/bulk-hard-remove',
      'delete',
      tenantId,
    );

    const removedFeatures = await this.featureService.bulkHardRemove(
      featureIds,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    return removedFeatures.length > 0;
  }

  @Query(() => [Feature], { description: 'Retrieve all soft-deleted features (recycle bin)' })
  @Roles('ADMIN', 'SUPERADMIN')
  async findAllDeleted(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ) {
    // Casbin authorization check
    await this.casbinHelperService.enforceAuthorization(userId, '/features/recycle-bin', 'read', tenantId);

    return this.featureService.findAllDeleted(tenantId, skip, take);
  }
}
