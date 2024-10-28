import { HttpException, HttpStatus } from '@nestjs/common';

export class CacheSetException extends HttpException {
  constructor(key: string, message: string) {
    super(`Cache Set Error: ${message} for key ${key}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
