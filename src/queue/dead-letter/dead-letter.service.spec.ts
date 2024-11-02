import { Test, TestingModule } from '@nestjs/testing';
import { DeadLetterService } from './dead-letter.service';

describe('DeadLetterService', () => {
  let service: DeadLetterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeadLetterService],
    }).compile();

    service = module.get<DeadLetterService>(DeadLetterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
