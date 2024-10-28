import { TenantFeatureInsertException } from './tenant-feature-insert.exception';

describe('TenantFeatureInsertException', () => {
  it('should return the correct error message and status code', () => {
    const exception = new TenantFeatureInsertException();
    
    expect(exception.getResponse()).toEqual('Failed to bulk insert tenant features.');
    expect(exception.getStatus()).toEqual(500); // HttpStatus.INTERNAL_SERVER_ERROR
  });
});
