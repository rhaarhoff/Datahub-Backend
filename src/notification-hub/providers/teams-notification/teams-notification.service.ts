// src/providers/teams-notification.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TeamsNotificationProvider {
  private readonly logger = new Logger(TeamsNotificationProvider.name);
  private readonly webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  async sendNotification(message: string, data?: any): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.error('Teams webhook URL is not configured.');
      throw new Error('Teams webhook URL is not configured.');
    }

    try {
      await axios.post(this.webhookUrl, {
        text: message,
        ...data,
      });
      this.logger.log('Notification sent to Teams successfully');
    } catch (error) {
      this.logger.error(`Failed to send notification to Teams: ${error.message}`);
      throw error;
    }
  }
}
