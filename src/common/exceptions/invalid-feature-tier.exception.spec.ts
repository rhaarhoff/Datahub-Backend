import { InvalidFeatureTierException } from './invalid-feature-tier.exception';

describe('InvalidFeatureTierException', () => {
  it('should return the correct error message for a given tierId', () => {
    const tierId = 5;
    const exception = new InvalidFeatureTierException(tierId);

    expect(exception.message).toEqual(`Feature tier with ID ${tierId} is invalid`);
    expect(exception.getStatus()).toBe(400); // Use getStatus() to check the HTTP status
  });

  it('should be an instance of InvalidFeatureTierException', () => {
    const exception = new InvalidFeatureTierException(5);
    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(InvalidFeatureTierException);
  });
});
