import { Test, TestingModule } from '@nestjs/testing';
import { TenantRoleService } from './tenant-role.service';

describe('TenantRoleService', () => {
  let service: TenantRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantRoleService],
    }).compile();

    service = module.get<TenantRoleService>(TenantRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
