import { BadRequestException } from '@nestjs/common';

export class SubscriptionPlanInsertException extends BadRequestException {
  constructor(message: string) {
    super(`Subscription Plan Insert Error: ${message}`);
  }
}
