import { SetMetadata } from '@nestjs/common';

export const Authorize = (resource: string, action: string) => SetMetadata('authorize', { resource, action });
