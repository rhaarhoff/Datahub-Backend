import { Module } from '@nestjs/common';
import { NotificationService } from './notification/notification.service';
import { QueueModule } from '../../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [NotificationService]
})
export class NotificationModule {}
