// src/subscription/subscription.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Route to handle subscription updates
  @Post(':tenantId/update')
  async updateSubscription(
    @Param('tenantId') tenantId: number,
    @Body('newPlanId') newPlanId: number,
  ) {
    //return this.subscriptionService.updateTenantFeatures(tenantId, newPlanId);
  }
}
