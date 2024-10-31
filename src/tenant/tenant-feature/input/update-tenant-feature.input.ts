import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional } from 'class-validator';

@InputType()
export class UpdateTenantFeatureInput {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @Field(() => Int)
  @IsInt()
  newPlanId: number;

  @Field({ nullable: true })
  @IsOptional()
  enabled?: boolean;
}
