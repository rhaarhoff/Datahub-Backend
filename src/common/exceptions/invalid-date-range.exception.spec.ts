import { InvalidDateRangeException } from './invalid-date-range.exception';

describe('InvalidDateRangeException', () => {
  it('should return a proper error message', () => {
    const exception = new InvalidDateRangeException();
    expect(exception.message).toBe('Start date cannot be later than end date.');
    expect(exception.getStatus()).toBe(400);
  });
});
