import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { FeatureAccessService } from './feature-access.service';
import { Logger } from '@nestjs/common';

@Resolver('FeatureAccess')
export class FeatureAccessResolver {
  private readonly logger = new Logger(FeatureAccessResolver.name);

  constructor(private readonly featureAccessService: FeatureAccessService) {}

  @Mutation(() => String)
  async updateFeatureAccess(@Args('tenantId', { type: () => String }) tenantId: string): Promise<string> {
    try {
      const tenantIdNumber = parseInt(tenantId, 10);
      if (isNaN(tenantIdNumber)) {
        throw new Error('Invalid tenantId, must be a number.');
      }

      await this.featureAccessService.updateFeatureAccessForRoles(tenantIdNumber);
      return `Feature access updated successfully for tenant ${tenantId}`;
    } catch (error) {
      this.logger.error(`Failed to update feature access for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }
}
