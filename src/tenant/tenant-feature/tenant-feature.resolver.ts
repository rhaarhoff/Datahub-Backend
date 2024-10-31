import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { TenantFeatureService } from './tenant-feature.service';
import { UpdateTenantFeatureInput } from './input/update-tenant-feature.input';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';

@Resolver('TenantFeature')
export class TenantFeatureResolver {
  private readonly logger = new Logger(TenantFeatureResolver.name);

  constructor(private readonly tenantFeatureService: TenantFeatureService) {}

  // Mutation to update tenant features for a given tenantId
  @Mutation(() => String)
  @UsePipes(new ValidationPipe())
  async updateTenantFeatures(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('updateTenantFeaturesInput') updateTenantFeaturesInput: UpdateTenantFeatureInput,
    @Context() context: any, // Assuming userId comes from context
  ): Promise<string> {
    try {
      const tenantIdNumber = parseInt(tenantId, 10);
      if (isNaN(tenantIdNumber)) {
        throw new Error('Invalid tenantId, must be a number.');
      }

      if (!updateTenantFeaturesInput.newPlanId) {
        throw new Error('newPlanId is required');
      }

      const userId = context.req.user.id; // Assuming you have userId in the request context

      return await this.tenantFeatureService.updateTenantFeatures(
        tenantIdNumber,
        updateTenantFeaturesInput.newPlanId,
        userId, // Pass userId to the service
      );
    } catch (error) {
      this.logger.error(`Failed to update features for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }

  // Query to get features for a given tenantId
  @Query(() => [String])
  @UsePipes(new ValidationPipe())
  async getTenantFeatures(@Args('tenantId', { type: () => String }) tenantId: string): Promise<any[]> {
    try {
      const tenantIdNumber = parseInt(tenantId, 10);
      if (isNaN(tenantIdNumber)) {
        throw new Error('Invalid tenantId, must be a number.');
      }

      return await this.tenantFeatureService.getTenantFeatures(tenantIdNumber);
    } catch (error) {
      this.logger.error(`Failed to get features for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }
}
