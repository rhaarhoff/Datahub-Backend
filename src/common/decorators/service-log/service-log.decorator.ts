import { SetMetadata } from '@nestjs/common';

export const SERVICE_LOG_KEY = 'serviceLog';
export const ServiceLog = (message: string): MethodDecorator => {
  return SetMetadata(SERVICE_LOG_KEY, message);
};
