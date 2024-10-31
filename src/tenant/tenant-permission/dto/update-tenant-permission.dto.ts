import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt } from 'class-validator';

@InputType()
export class UpdateTenantPermissionDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  tenantId?: number;
}
