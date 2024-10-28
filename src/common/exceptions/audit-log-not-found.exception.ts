import { NotFoundException } from '@nestjs/common';

export class AuditLogNotFoundException extends NotFoundException {
  constructor(logId: number) {
    super(`Audit log with ID ${logId} not found.`);
  }
}
