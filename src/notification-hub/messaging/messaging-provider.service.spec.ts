import { Test, TestingModule } from '@nestjs/testing';
import { MessagingProviderService } from './messaging-provider.service';

describe('MessagingProviderService', () => {
  let service: MessagingProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingProviderService],
    }).compile();

    service = module.get<MessagingProviderService>(MessagingProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
