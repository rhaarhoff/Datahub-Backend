import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SubscriptionPlanInvalidException } from '../common/exceptions/subscription-plan-invalid.exception';
import { SubscriptionPlanUpdateException } from '../common/exceptions/subscription-plan-update.exception';
import { SubscriptionPlanInsertException } from '../common/exceptions/subscription-plan-insert.exception';
import { SubscriptionPlan } from '@prisma/client';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);
  private readonly bulkInsertChunkSize = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // Centralized error handling method
  private handleError(id: number, action: string, error: any): never {
    this.logger.error(
      `Failed to ${action} subscription plan with ID ${id}: ${error.message}`,
    );
    throw new SubscriptionPlanUpdateException(
      `Failed to ${action} subscription plan with ID ${id}`,
    );
  }

  // Validate input data for subscription plan
  private validateSubscriptionPlanInput(
    input: CreateSubscriptionPlanDto,
  ): void {
    if (!input.name || input.price < 0) {
      throw new SubscriptionPlanInvalidException(
        'Invalid subscription plan input data',
      );
    }

    if (
      !['MONTHLY', 'ANNUAL', 'WEEKLY', 'QUARTERLY'].includes(input.billingCycle)
    ) {
      throw new SubscriptionPlanInvalidException(
        'Invalid billing cycle for subscription plan',
      );
    }

    if (input.billingCycle === 'ANNUAL' && !input.trialPeriodDays) {
      throw new SubscriptionPlanInvalidException(
        'Trial period is required for annual plans',
      );
    }
  }

  // Clear cache for specific subscription plan
  private async clearCacheForPlan(id: number): Promise<void> {
    const cacheKey = this.cacheService.generateCacheKey(
      'subscription',
      id.toString(),
    );
    await this.cacheService.clear(cacheKey);
    this.logger.log(`Cache cleared for subscription plan with ID ${id}`);
  }

  async create(
    createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    this.validateSubscriptionPlanInput(createSubscriptionPlanDto);

    try {
      const newPlan = await this.prisma.subscriptionPlan.create({
        data: createSubscriptionPlanDto,
      });
      this.logger.log(`Subscription plan created: ${newPlan.name}`);
      return newPlan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${error.message}`);
      throw new SubscriptionPlanInsertException(
        'Failed to create subscription plan',
      );
    }
  }

  async findAll(): Promise<SubscriptionPlan[]> {
    try {
      const activePlans = await this.prisma.subscriptionPlan.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(
        `Retrieved ${activePlans.length} active subscription plans`,
      );
      return activePlans;
    } catch (error) {
      this.logger.error(`Error fetching subscription plans: ${error.message}`);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  async findOne(
    id: number,
    includeRelations: boolean,
  ): Promise<SubscriptionPlan> {
    const cacheKey = this.cacheService.generateCacheKey(
      'subscription',
      `${id}-${includeRelations}`,
    );

    try {
      let plan = await this.cacheService.get<SubscriptionPlan>(cacheKey);

      if (!plan) {
        plan = await this.querySubscriptionPlan(id, includeRelations);
        await this.cacheService.set(
          cacheKey,
          plan,
          this.cacheService.getTTLForFeature('subscription'),
        );
      }

      this.logger.log(`Retrieved subscription plan with ID ${id}`);
      return plan;
    } catch (error) {
      this.handleFindOneError(id, error);
    }
  }

  private async querySubscriptionPlan(
    id: number,
    includeRelations: boolean,
  ): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: includeRelations ? { tenants: true, features: true } : {},
    });

    if (!plan || plan.deletedAt) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    return plan;
  }

  private handleFindOneError(id: number, error: any): never {
    this.logger.error(
      `Error retrieving subscription plan with ID ${id}: ${error.message}`,
    );
    throw error;
  }

  async findAllDeleted(): Promise<SubscriptionPlan[]> {
    try {
      const deletedPlans = await this.prisma.subscriptionPlan.findMany({
        where: { deletedAt: { not: null } },
      });
      this.logger.log(
        `Retrieved ${deletedPlans.length} soft-deleted subscription plans`,
      );
      return deletedPlans;
    } catch (error) {
      this.logger.error(
        `Error fetching deleted subscription plans: ${error.message}`,
      );
      throw new Error('Failed to fetch deleted subscription plans');
    }
  }

  async update(
    id: number,
    updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan || plan.deletedAt) {
        throw new NotFoundException(
          `Subscription plan with ID ${id} not found`,
        );
      }

      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: updateSubscriptionPlanDto,
      });

      await this.clearCacheForPlan(id); // clear cache using plan ID
      this.logger.log(`Subscription plan with ID ${id} updated`);
      return updatedPlan;
    } catch (error) {
      this.handleError(id, 'update', error);
    }
  }

  async remove(id: number): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan || plan.deletedAt) {
        throw new NotFoundException(
          `Subscription plan with ID ${id} not found`,
        );
      }

      const tenantCheck = await this.prisma.tenant.findFirst({
        where: { subscriptionPlanId: id },
      });

      if (tenantCheck) {
        throw new SubscriptionPlanUpdateException(
          `Cannot delete plan with ID ${id} as it is currently assigned to active tenants`,
        );
      }

      const softDeletedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await this.clearCacheForPlan(id); // clear cache using plan ID
      this.logger.log(`Subscription plan with ID ${id} soft-deleted`);
      return softDeletedPlan;
    } catch (error) {
      this.handleError(id, 'soft-delete', error);
    }
  }

  async restore(id: number): Promise<SubscriptionPlan> {
    const cacheKey = this.cacheService.generateCacheKey(
      'subscription',
      id.toString(),
    );

    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan?.deletedAt) {
        throw new NotFoundException(
          `Subscription plan with ID ${id} is not in the recycle bin`,
        );
      }

      const restoredPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: { deletedAt: null },
      });

      await this.cacheService.set(
        cacheKey,
        restoredPlan,
        this.cacheService.getTTLForFeature('subscription'),
      );
      this.logger.log(`Subscription plan with ID ${id} restored`);
      return restoredPlan;
    } catch (error) {
      this.handleError(id, 'restore', error);
    }
  }

  async hardRemove(id: number): Promise<void> {
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundException(
          `Subscription plan with ID ${id} not found`,
        );
      }

      const tenantCheck = await this.prisma.tenant.findFirst({
        where: { subscriptionPlanId: id },
      });

      if (tenantCheck) {
        throw new SubscriptionPlanUpdateException(
          `Cannot permanently delete plan with ID ${id} as it is currently assigned to active tenants`,
        );
      }

      await this.prisma.subscriptionPlan.delete({
        where: { id },
      });

      await this.clearCacheForPlan(id);
      this.logger.log(`Subscription plan with ID ${id} permanently deleted`);
    } catch (error) {
      this.handleError(id, 'hard-delete', error);
    }
  }

  // Bulk create plans with chunking
  async bulkCreate(
    createSubscriptionPlans: CreateSubscriptionPlanDto[],
  ): Promise<SubscriptionPlan[]> {
    const chunks = this.chunkArray(
      createSubscriptionPlans,
      this.bulkInsertChunkSize,
    );

    const results: SubscriptionPlan[] = [];
    for (const chunk of chunks) {
      // Iterate through each chunk and create records individually
      for (const planData of chunk) {
        const newPlan = await this.prisma.subscriptionPlan.create({
          data: planData,
        });
        results.push(newPlan);
      }
    }

    this.logger.log(`${results.length} subscription plans created in bulk.`);
    return results;
  }

  // Helper method to chunk arrays
  private chunkArray(array, size) {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  }
}
