import { MaxTakePipe } from './max-take.pipe';
import { BadRequestException } from '@nestjs/common';

describe('MaxTakePipe', () => {
  let pipe: MaxTakePipe;

  beforeEach(() => {
    pipe = new MaxTakePipe(100); // Setting the maximum take to 100
  });

  it('should return the provided value if it is within the maximum limit', () => {
    expect(pipe.transform('50')).toBe(50);
    expect(pipe.transform('100')).toBe(100);
  });

  it('should return the maximum value if the provided value exceeds the limit', () => {
    expect(pipe.transform('150')).toBe(100);
  });

  it('should throw a BadRequestException for invalid or non-numeric values', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
    expect(() => pipe.transform('')).toThrow(BadRequestException);
    expect(() => pipe.transform('-10')).toThrow(BadRequestException);
  });

  it('should throw a BadRequestException for zero or negative values', () => {
    expect(() => pipe.transform('0')).toThrow(BadRequestException);
    expect(() => pipe.transform('-10')).toThrow(BadRequestException);
  });
});
