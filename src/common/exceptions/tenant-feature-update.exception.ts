import { HttpException, HttpStatus } from '@nestjs/common';

export class TenantFeatureUpdateException extends HttpException {
  constructor(tenantId: number, message: string = `Failed to update tenant features for tenant ${tenantId}`) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
