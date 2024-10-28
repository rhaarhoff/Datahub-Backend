import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { BillingCycle } from '@prisma/client';

@InputType()
export class CreateSubscriptionPlanInput {

  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0) // Ensure price is non-negative
  price: number;

  @Field(() => BillingCycle)
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0) // Ensure trial days cannot be negative
  @Max(365) // Ensure trial days are less than a year
  trialPeriodDays?: number;
}
