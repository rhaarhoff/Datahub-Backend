import { Test, TestingModule } from '@nestjs/testing';
import { Authorize } from './authorize.decorator';

describe('Authorize', () => {
  let provider: Authorize;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Authorize],
    }).compile();

    provider = module.get<Authorize>(Authorize);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
