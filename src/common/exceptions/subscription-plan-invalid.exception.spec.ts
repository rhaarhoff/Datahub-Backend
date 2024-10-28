import { SubscriptionPlanInvalidException } from './subscription-plan-invalid.exception';

describe('SubscriptionPlanInvalidException', () => {
  it('should return the correct error message and status code', () => {
    const exception = new SubscriptionPlanInvalidException();
    
    expect(exception.getResponse()).toEqual('Invalid subscription plan or no features linked to the plan.');
    expect(exception.getStatus()).toEqual(400); // HttpStatus.BAD_REQUEST
  });
});
