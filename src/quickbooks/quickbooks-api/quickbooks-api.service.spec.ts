import { Test, TestingModule } from '@nestjs/testing';
import { QuickbooksApiService } from './quickbooks-api.service';

describe('QuickbooksApiService', () => {
  let service: QuickbooksApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickbooksApiService],
    }).compile();

    service = module.get<QuickbooksApiService>(QuickbooksApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
