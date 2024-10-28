import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanResolver } from './subscription-plan.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlanController } from './subscription-plan.controller';

@Module({
  providers: [SubscriptionPlanResolver, SubscriptionPlanService, PrismaService],
  exports: [SubscriptionPlanService],
  controllers: [SubscriptionPlanController],
})
export class SubscriptionPlanModule {}
