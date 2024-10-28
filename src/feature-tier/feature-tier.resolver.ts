// src/feature-tier/feature-tier.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { FeatureTierService } from './feature-tier.service';
import { CreateFeatureTierInput } from './dto/create-feature-tier.input';
import { UpdateFeatureTierInput } from './dto/update-feature-tier.input';
import { FeatureTierModel } from './models/feature-tier.model';

@Resolver(() => FeatureTierModel)
export class FeatureTierResolver {
  constructor(private readonly featureTierService: FeatureTierService) {}

  // Find all feature tiers
  @Query(() => [FeatureTierModel], { name: 'featureTiers' })
  findAll() {
    return this.featureTierService.findAll();
  }

  // Find a specific feature tier by ID
  @Query(() => FeatureTierModel, { name: 'featureTier' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.featureTierService.findOne(id);
  }

  // Create a new feature tier
  @Mutation(() => FeatureTierModel)
  createFeatureTier(
    @Args('createFeatureTierInput') createFeatureTierInput: CreateFeatureTierInput,
  ) {
    return this.featureTierService.create(createFeatureTierInput);
  }

  // Update an existing feature tier
  @Mutation(() => FeatureTierModel)
  updateFeatureTier(
    @Args('id', { type: () => Int }) id: number,
    @Args('updateFeatureTierInput') updateFeatureTierInput: UpdateFeatureTierInput,
  ) {
    return this.featureTierService.update(id, updateFeatureTierInput);
  }

  // Get all soft-deleted feature tiers (recycle bin)
  @Query(() => [FeatureTierModel], { name: 'deletedFeatureTiers' })
  findDeleted() {
    return this.featureTierService.findDeleted();
  }

  // Restore a soft-deleted feature tier
  @Mutation(() => FeatureTierModel)
  restoreFeatureTier(@Args('id', { type: () => Int }) id: number) {
    return this.featureTierService.restore(id);
  }

  // Remove (soft-delete) a feature tier
  @Mutation(() => FeatureTierModel)
  removeFeatureTier(@Args('id', { type: () => Int }) id: number) {
    return this.featureTierService.remove(id);
  }
}
