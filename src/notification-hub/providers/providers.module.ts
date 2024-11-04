import { Module } from '@nestjs/common';
import { TeamsNotificationProvider } from './teams-notification/teams-notification.service';

@Module({
  providers: [TeamsNotificationProvider],
  exports: [TeamsNotificationProvider],
})
export class ProvidersModule {}
