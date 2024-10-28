import { HttpException, HttpStatus } from '@nestjs/common';

export class TenantFeatureInsertException extends HttpException {
  constructor(message: string = 'Failed to bulk insert tenant features.') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
