import { CreateTenantDto } from './create-tenant.dto';

describe('CreateTenantDto', () => {
  it('should be defined', () => {
    expect(new CreateTenantDto()).toBeDefined();
  });
});
