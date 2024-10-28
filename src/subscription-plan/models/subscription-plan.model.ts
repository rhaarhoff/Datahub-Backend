import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { Tenant } from '../../tenant/models/tenant.model';
import { Feature } from '../../feature-access/models/feature-access.model';
import { BillingCycle } from '@prisma/client';

@ObjectType()
export class SubscriptionPlan {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => Float)
  price: number;

  @Field(() => BillingCycle)
  billingCycle: BillingCycle;

  @Field(() => Int, { nullable: true })
  trialPeriodDays?: number;

  @Field(() => [Tenant], { nullable: true })
  tenants?: Tenant[];

  @Field(() => [Feature], { nullable: true })
  features?: Feature[];

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
