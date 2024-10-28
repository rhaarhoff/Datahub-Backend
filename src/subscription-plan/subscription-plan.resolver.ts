import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlan } from './models/subscription-plan.model';
import { CreateSubscriptionPlanInput } from './dto/create-subscription-plan.input';
import { UpdateSubscriptionPlanInput } from './dto/update-subscription-plan.input';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator'; // Adjust path based on your project structure
import { RolesGuard } from '../common/guards/roles.guard'; // Adjust path based on your project structure

@Resolver(() => SubscriptionPlan)
@UseGuards(RolesGuard) // Apply RBAC globally
export class SubscriptionPlanResolver {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  // Helper method to ensure that the plan exists, throwing an error if not
  private async ensurePlanExists(id: number, includeRelations: boolean = false): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanService.findOne(id, includeRelations);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found.`);
    }
    return plan;
  }

  // Mutation to create a new subscription plan
  @Mutation(() => SubscriptionPlan)
  @Roles('ADMIN', 'SUPERADMIN') // Only admins and superadmins can create a subscription plan
  async createSubscriptionPlan(
    @Args('createSubscriptionPlanInput') createSubscriptionPlanInput: CreateSubscriptionPlanInput,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.create(createSubscriptionPlanInput);
  }

  // **NEW** Mutation to create subscription plans in bulk
  @Mutation(() => [SubscriptionPlan])
  @Roles('ADMIN', 'SUPERADMIN') // Only admins and superadmins can bulk create subscription plans
  async bulkCreateSubscriptionPlans(
    @Args({ name: 'createSubscriptionPlanInputs', type: () => [CreateSubscriptionPlanInput] })
    createSubscriptionPlanInputs: CreateSubscriptionPlanInput[],
  ): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanService.bulkCreate(createSubscriptionPlanInputs);
  }

  // Query to retrieve all active (non-soft-deleted) subscription plans
  @Query(() => [SubscriptionPlan], { name: 'subscriptionPlans' })
  async findAll(): Promise<SubscriptionPlan[]> {
    const plans = await this.subscriptionPlanService.findAll();
    if (plans.length === 0) {
      throw new NotFoundException('No active subscription plans found.');
    }
    return plans;
  }

  // Query to retrieve all soft-deleted subscription plans (recycle bin)
  @Query(() => [SubscriptionPlan], { name: 'softDeletedSubscriptionPlans' })
  @Roles('ADMIN', 'SUPERADMIN') // Only admins can access soft-deleted plans
  async findAllDeleted(): Promise<SubscriptionPlan[]> {
    const plans = await this.subscriptionPlanService.findAllDeleted();
    if (plans.length === 0) {
      throw new NotFoundException('No soft-deleted subscription plans found in the recycle bin.');
    }
    return plans;
  }

  // Query to retrieve a specific subscription plan by ID
  @Query(() => SubscriptionPlan, { name: 'subscriptionPlan' })
  async findOne(
    @Args('id', { type: () => Int }) id: number,
    @Args('includeRelations', { type: () => Boolean, defaultValue: false }) includeRelations: boolean,
  ): Promise<SubscriptionPlan> {
    return this.ensurePlanExists(id, includeRelations);
  }

  // Mutation to update a subscription plan
  @Mutation(() => SubscriptionPlan)
  @Roles('ADMIN', 'SUPERADMIN') // Only admins can update a subscription plan
  async updateSubscriptionPlan(
    @Args('id', { type: () => Int }) id: number,
    @Args('updateSubscriptionPlanInput') updateSubscriptionPlanInput: UpdateSubscriptionPlanInput,
  ): Promise<SubscriptionPlan> {
    await this.ensurePlanExists(id);
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanInput);
  }

  // Mutation to soft-delete a subscription plan (move to recycle bin)
  @Mutation(() => SubscriptionPlan)
  @Roles('ADMIN', 'SUPERADMIN') // Only admins can soft delete a subscription plan
  async softDeleteSubscriptionPlan(@Args('id', { type: () => Int }) id: number): Promise<SubscriptionPlan> {
    await this.ensurePlanExists(id);
    return this.subscriptionPlanService.remove(id);
  }

  // Mutation to restore a soft-deleted subscription plan from the recycle bin
  @Mutation(() => SubscriptionPlan)
  @Roles('ADMIN', 'SUPERADMIN') // Only admins can restore a soft-deleted plan
  async restoreSubscriptionPlan(@Args('id', { type: () => Int }) id: number): Promise<SubscriptionPlan> {
    const plan = await this.ensurePlanExists(id);
    if (!plan.deletedAt) {
      throw new NotFoundException(`Subscription plan with ID ${id} is not in the recycle bin.`);
    }
    return this.subscriptionPlanService.restore(id);
  }

  // Mutation to permanently delete a subscription plan (hard delete)
  @Mutation(() => Boolean)
  @Roles('SUPERADMIN') // Only superadmins can hard delete a subscription plan
  async hardDeleteSubscriptionPlan(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    await this.ensurePlanExists(id);
    await this.subscriptionPlanService.hardRemove(id);
    return true; // Return true to indicate success
  }
}
