import { Test, TestingModule } from '@nestjs/testing';
import { TenantRoleController } from './tenant-role.controller';

describe('TenantRoleController', () => {
  let controller: TenantRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantRoleController],
    }).compile();

    controller = module.get<TenantRoleController>(TenantRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
