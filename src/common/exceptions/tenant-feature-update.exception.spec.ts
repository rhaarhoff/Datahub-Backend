import { TenantFeatureUpdateException } from './tenant-feature-update.exception';

describe('TenantFeatureUpdateException', () => {
  it('should return the correct error message and status code', () => {
    const tenantId = 101;
    const exception = new TenantFeatureUpdateException(tenantId);
    
    expect(exception.getResponse()).toEqual(`Failed to update tenant features for tenant ${tenantId}`);
    expect(exception.getStatus()).toEqual(500); // HttpStatus.INTERNAL_SERVER_ERROR
  });
});
