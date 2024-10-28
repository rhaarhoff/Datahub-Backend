import { Test, TestingModule } from '@nestjs/testing';
import { QuickbooksAuthService } from './quickbooks-auth.service';

describe('QuickbooksAuthService', () => {
  let service: QuickbooksAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickbooksAuthService],
    }).compile();

    service = module.get<QuickbooksAuthService>(QuickbooksAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
