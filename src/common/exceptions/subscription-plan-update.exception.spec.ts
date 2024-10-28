import { SubscriptionPlanUpdateException } from './subscription-plan-update.exception';

describe('SubscriptionPlanUpdateException', () => {
  it('should create a SubscriptionPlanUpdateException', () => {
    const exception = new SubscriptionPlanUpdateException('Test error message');
    expect(exception).toBeDefined();
    expect(exception.message).toEqual('Subscription Plan Update Error: Test error message');
  });
});
