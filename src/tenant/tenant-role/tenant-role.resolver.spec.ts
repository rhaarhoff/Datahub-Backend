import { Test, TestingModule } from '@nestjs/testing';
import { TenantRoleResolver } from './tenant-role.resolver';

describe('TenantRoleResolver', () => {
  let resolver: TenantRoleResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantRoleResolver],
    }).compile();

    resolver = module.get<TenantRoleResolver>(TenantRoleResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
