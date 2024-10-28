import { FeatureNotFoundException } from './feature-not-found.exception';

describe('FeatureNotFoundException', () => {
  it('should return the correct error message for a given featureId and tenantId', () => {
    const featureId = 1;
    const tenantId = 100;
    const exception = new FeatureNotFoundException(featureId, tenantId);

    expect(exception.message).toEqual(`Feature with ID ${featureId} not found for tenant ${tenantId}`);
    expect(exception.getStatus()).toBe(404); // Use getStatus() to check the HTTP status
  });

  it('should be an instance of FeatureNotFoundException', () => {
    const exception = new FeatureNotFoundException(1, 100);
    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(FeatureNotFoundException);
  });
});
