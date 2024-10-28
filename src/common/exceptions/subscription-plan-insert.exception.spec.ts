import { SubscriptionPlanInsertException } from './subscription-plan-insert.exception';

describe('SubscriptionPlanInsertException', () => {
  it('should create a SubscriptionPlanInsertException', () => {
    const exception = new SubscriptionPlanInsertException('Test error message');
    expect(exception).toBeDefined();
    expect(exception.message).toEqual('Subscription Plan Insert Error: Test error message');
  });
});
