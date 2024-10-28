import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class CreateSubscriptionPlanDto {

  @ApiProperty({ example: 'Pro Plan', description: 'The name of the subscription plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A comprehensive plan for advanced users', description: 'Description of the plan' })
  @IsString()
  description: string;

  @ApiProperty({ example: 49.99, description: 'Price of the subscription plan' })
  @IsNumber()
  @Min(0) // Ensure price is non-negative
  price: number;

  @ApiProperty({ example: BillingCycle.MONTHLY, description: 'Billing cycle of the plan' })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ example: 14, description: 'Number of trial days', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365) // Ensure trial days are less than a year
  @Min(0) // Ensure trial days cannot be negative
  trialPeriodDays?: number;
}
