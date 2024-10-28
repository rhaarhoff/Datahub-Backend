import { HttpException, HttpStatus } from '@nestjs/common';

export class SubscriptionPlanInvalidException extends HttpException {
  constructor(message: string = 'Invalid subscription plan or no features linked to the plan.') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
