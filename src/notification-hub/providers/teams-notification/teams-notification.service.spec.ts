import { Controller, Post, Body } from '@nestjs/common';
import { TeamsNotificationProvider } from './teams-notification.service';

@Controller('providers/test')
export class TestController {
  constructor(private readonly teamsProvider: TeamsNotificationProvider) {}

  @Post('send-teams-notification')
  async sendTeamsNotification(@Body('message') message: string) {
    await this.teamsProvider.sendNotification(message);
    return { status: 'Notification sent to Teams' };
  }
}