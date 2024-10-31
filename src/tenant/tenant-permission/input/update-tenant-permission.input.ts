import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt } from 'class-validator';

@InputType()
export class UpdateTenantPermissionInput {
  @Field(() => Int)
  @IsInt()
  tenantId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
