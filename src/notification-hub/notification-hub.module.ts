import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { TemplatesModule } from './templates/templates.module';
import { RoutingModule } from './routing/routing.module';
import { RetryModule } from './retry/retry.module';
import { PreferencesModule } from './preferences/preferences.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [ProvidersModule, TemplatesModule, RoutingModule, RetryModule, PreferencesModule, MessagingModule, NotificationModule, UtilsModule]
})
export class NotificationHubModule {}
