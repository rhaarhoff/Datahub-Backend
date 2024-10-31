import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsBoolean } from 'class-validator';

@InputType()
export class CreateTenantFeatureInput {
  @Field(() => Int)
  @IsInt()
  tenantId: number;

  @Field(() => Int)
  @IsInt()
  featureId: number;

  @Field({ defaultValue: true })
  @IsBoolean()
  enabled?: boolean;
}
