import { PartialType } from '@nestjs/mapped-types';
import { SubscriptionPlan } from '../models/subscription-plan.model';

export class SubscriptionPlanWithOptionalRelationsDto extends PartialType(SubscriptionPlan) {}
