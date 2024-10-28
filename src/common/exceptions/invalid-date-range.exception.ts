import { BadRequestException } from '@nestjs/common';

export class InvalidDateRangeException extends BadRequestException {
  constructor() {
    super('Start date cannot be later than end date.');
  }
}
