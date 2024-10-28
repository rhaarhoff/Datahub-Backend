import { CacheClearException } from './cache-clear.exception';
import { HttpStatus } from '@nestjs/common';

describe('CacheClearException', () => {
  it('should create a CacheClearException with the correct message and status code', () => {
    const key = 'testKey';
    const message = 'Test cache clear error';
    const exception = new CacheClearException(key, message);

    expect(exception.message).toBe(`Cache Clear Error: ${message} for key ${key}`);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should return INTERNAL_SERVER_ERROR as status code', () => {
    const key = 'anotherKey';
    const message = 'Another error message';
    const exception = new CacheClearException(key, message);

    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
