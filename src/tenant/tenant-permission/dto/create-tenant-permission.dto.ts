import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

@InputType()
export class CreateTenantPermissionDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  tenantId?: number;
}
