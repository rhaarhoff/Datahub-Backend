// common/exceptions/invalid-feature-tier.exception.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidFeatureTierException extends BadRequestException {
  constructor(tierId: number) {
    super(`Feature tier with ID ${tierId} is invalid`);
  }
}