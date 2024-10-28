import { CacheSetException } from './cache-set.exception';
import { HttpStatus } from '@nestjs/common';

describe('CacheSetException', () => {
  it('should create a CacheSetException with the correct message and status code', () => {
    const key = 'testKey';
    const message = 'Test cache set error';
    const exception = new CacheSetException(key, message);

    expect(exception.message).toBe(`Cache Set Error: ${message} for key ${key}`);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should return INTERNAL_SERVER_ERROR as status code', () => {
    const key = 'anotherKey';
    const message = 'Another error message';
    const exception = new CacheSetException(key, message);

    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
