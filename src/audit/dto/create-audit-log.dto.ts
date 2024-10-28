import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'The type of audit action performed',
    example: AuditAction.CREATE_FEATURE,
    enum: AuditAction, // This maps the enum to Swagger
  })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({
    description: 'The ID of the user who performed the action',
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'The ID of the tenant, if applicable',
    example: 2,
    required: false, // This ensures Swagger marks it as optional
  })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @ApiProperty({
    description: 'The ID of the feature, if applicable',
    example: 101,
    required: false,
  })
  @IsOptional()
  @IsInt()
  featureId?: number;

  @ApiProperty({
    description: 'The state of the entity before the action was performed, serialized as a string',
    example: '{"name": "Old Feature Name"}',
    required: false,
  })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiProperty({
    description: 'The state of the entity after the action was performed, serialized as a string',
    example: '{"name": "New Feature Name"}',
    required: false,
  })
  @IsOptional()
  @IsString()
  after?: string;
}
