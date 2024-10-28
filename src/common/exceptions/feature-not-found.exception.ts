// common/exceptions/feature-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class FeatureNotFoundException extends NotFoundException {
  constructor(featureId: number, tenantId: number) {
    super(`Feature with ID ${featureId} not found for tenant ${tenantId}`);
  }
}


