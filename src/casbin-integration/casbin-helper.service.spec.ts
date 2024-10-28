import { Test, TestingModule } from '@nestjs/testing';
import { CasbinHelperService } from './casbin-helper.service';

describe('CasbinHelperService', () => {
  let service: CasbinHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CasbinHelperService],
    }).compile();

    service = module.get<CasbinHelperService>(CasbinHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
