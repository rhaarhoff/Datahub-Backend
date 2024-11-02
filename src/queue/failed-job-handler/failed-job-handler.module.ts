import { Module } from '@nestjs/common';
import { FailedJobHandlerService } from './failed-job-handler.service';

@Module({
  providers: [FailedJobHandlerService]
})
export class FailedJobHandlerModule {}
