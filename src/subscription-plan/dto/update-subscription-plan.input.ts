import { InputType, Field, Int } from '@nestjs/graphql';
import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionPlanInput } from './create-subscription-plan.input';

@InputType()
export class UpdateSubscriptionPlanInput extends PartialType(CreateSubscriptionPlanInput) {
  @Field(() => Int)
  id: number;
}
