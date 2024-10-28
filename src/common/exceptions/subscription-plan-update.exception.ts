import { BadRequestException } from '@nestjs/common';

export class SubscriptionPlanUpdateException extends BadRequestException {
  constructor(message: string) {
    super(`Subscription Plan Update Error: ${message}`);
  }
}
