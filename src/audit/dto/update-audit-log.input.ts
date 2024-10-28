// src/audit/dto/update-audit-log.input.ts
import { InputType, PartialType } from '@nestjs/graphql';
import { CreateAuditLogInput } from './create-audit-log.input';

@InputType()
export class UpdateAuditLogInput extends PartialType(CreateAuditLogInput) {}
