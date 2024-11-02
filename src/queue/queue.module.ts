import { Module } from '@nestjs/common';
import { BullConfigModule } from './bull-config/bull-config.module';
import { RetryModule } from './retry/retry.module';
import { DeadLetterModule } from './dead-letter/dead-letter.module';
import { FailedJobHandlerModule } from './failed-job-handler/failed-job-handler.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
    imports: [
      BullConfigModule,
      RetryModule,
      DeadLetterModule,
      FailedJobHandlerModule,
      MonitoringModule,
    ],
    exports: [
      BullConfigModule,
      RetryModule,
      DeadLetterModule,
      FailedJobHandlerModule,
      MonitoringModule,
    ],
  })
  export class QueueModule {}
