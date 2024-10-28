import { HttpException, HttpStatus } from '@nestjs/common';

export class CacheClearException extends HttpException {
  constructor(key: string, message: string) {
    super(`Cache Clear Error: ${message} for key ${key}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
