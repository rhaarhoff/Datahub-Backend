import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditLogDto } from './create-audit-log.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {
  @ApiPropertyOptional({
    description: 'The type of audit action performed',
    example: 'CREATE_FEATURE',
  })
  action?: AuditAction; // Ensure the type is `AuditAction` instead of `string`

  @ApiPropertyOptional({
    description: 'The ID of the user who performed the action',
    example: 1,
  })
  userId?: number;

  @ApiPropertyOptional({
    description: 'The ID of the tenant, if applicable',
    example: 2,
  })
  tenantId?: number;

  @ApiPropertyOptional({
    description: 'The ID of the feature, if applicable',
    example: 101,
  })
  featureId?: number;

  @ApiPropertyOptional({
    description: 'The state of the entity before the action, serialized as a string',
    example: '{"name": "Old Feature Name"}',
  })
  before?: string;

  @ApiPropertyOptional({
    description: 'The state of the entity after the action, serialized as a string',
    example: '{"name": "New Feature Name"}',
  })
  after?: string;
}
