// src/audit/dto/create-audit-log.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';
import { AuditAction } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class CreateAuditLogInput {
  @Field(() => AuditAction, { description: 'The type of audit action performed' })
  @IsEnum(AuditAction)
  action: AuditAction;

  @Field(() => Int, { description: 'The ID of the user performing the action' })
  @IsInt()
  userId: number;

  @Field(() => Int, { nullable: true, description: 'The ID of the tenant, if applicable' })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @Field(() => Int, { nullable: true, description: 'The ID of the feature, if applicable' })
  @IsOptional()
  @IsInt()
  featureId?: number;

  @Field(() => String, { nullable: true, description: 'The state of the entity before the action was performed' })
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'The "before" field must be between 1 and 500 characters.' })
  before?: string;

  @Field(() => String, { nullable: true, description: 'The state of the entity after the action was performed' })
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'The "after" field must be between 1 and 500 characters.' })
  after?: string;
}
