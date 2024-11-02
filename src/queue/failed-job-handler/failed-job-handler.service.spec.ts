import { Test, TestingModule } from '@nestjs/testing';
import { FailedJobHandlerService } from './failed-job-handler.service';

describe('FailedJobHandlerService', () => {
  let service: FailedJobHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FailedJobHandlerService],
    }).compile();

    service = module.get<FailedJobHandlerService>(FailedJobHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
