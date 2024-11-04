import { Module } from '@nestjs/common';
import { UserNotificationPreferenceService } from './user-notification-preference/user-notification-preference.service';

@Module({
  providers: [UserNotificationPreferenceService]
})
export class PreferencesModule {}
