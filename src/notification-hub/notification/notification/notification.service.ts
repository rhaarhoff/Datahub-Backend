// src/notification-hub/notification/notification.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MessagingProviderService } from '../providers/messaging-provider.service';
import { NotificationTemplateService } from '../templates/notification-template.service';
import { UserNotificationPreferenceService } from '../../preferences/user-notification-preference/user-notification-preference.service';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly maxRetries: number;
  private readonly backoffDelay: number;

  constructor(
    private readonly messagingProviderService: MessagingProviderService,
    private readonly notificationTemplateService: NotificationTemplateService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
    @Inject('NOTIFICATION_QUEUE') private readonly notificationQueue: Queue,
    private readonly configService: ConfigService
  ) {
    this.maxRetries = this.configService.get<number>('NOTIFICATION_MAX_RETRIES', 3);
    this.backoffDelay = this.configService.get<number>('NOTIFICATION_BACKOFF_DELAY', 1000);
  }

  /**
   * Sends a notification based on user preferences and template.
   */
  async sendNotification(userId: number, messageType: string, data: Record<string, any>): Promise<void> {
    try {
      const tenantId = 1; // Replace with actual tenantId
      const preferences = await this.userNotificationPreferenceService.getUserPreferences(userId, tenantId, messageType);
      const template = await this.notificationTemplateService.getTemplate(messageType, preferences.preferredChannelIds);
      const message = this.compileMessage(template.content, data);

      await this.notificationQueue.add('sendNotification', { userId, message, preferences });
      this.logger.log(`Notification queued for user ${userId} with message type ${messageType}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Processes and sends the notification through the selected provider.
   */
  async processNotification(userId: number, message: string, channel: string): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const provider = await this.messagingProviderService.getProvider(channel);
        await provider.sendMessage(userId, message);
        this.logger.log(`Notification sent to user ${userId} via ${channel}`);
        return; // Success, exit the retry loop
      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed to send notification to user ${userId} via ${channel}: ${error.message}`);

        if (attempt === this.maxRetries) {
          this.logger.error(`Max retries reached for user ${userId} notification on ${channel}. Initiating fallback or alert.`);
          await this.handleNotificationFailure(userId, message, channel, error);
        } else {
          await new Promise(resolve => setTimeout(resolve, this.backoffDelay * attempt));
        }
      }
    }
  }

  /**
   * Fallback handling or alert for failed notifications.
   */
  private async handleNotificationFailure(userId: number, message: string, channel: string, error: Error): Promise<void> {
    try {
      const fallbackProvider = await this.messagingProviderService.getFallbackProvider(channel);
      if (fallbackProvider) {
        await fallbackProvider.sendMessage(userId, message);
        this.logger.log(`Fallback notification sent to user ${userId} via alternate channel`);
      } else {
        await this.sendFailureAlert(`Notification to user ${userId} failed on primary and no fallback was available.`);
      }
    } catch (fallbackError) {
      this.logger.error(`Fallback notification also failed for user ${userId}.`);
      await this.sendFailureAlert(`Notification failure for user ${userId}: ${error.message}. Fallback error: ${fallbackError.message}`);
    }
  }

  /**
   * Sends an alert about a failure to process a notification.
   */
  private async sendFailureAlert(alertMessage: string): Promise<void> {
    // Log to monitoring or send alert
    this.logger.warn(`ALERT: ${alertMessage}`);
    // Integrate with alerting mechanism (e.g., email, Slack, etc.)
  }

  /**
   * Utility function to compile the message template with user-specific data.
   */
  private compileMessage(template: string, data: Record<string, any>): string {
    return Object.keys(data).reduce((compiled, key) => {
      return compiled.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }, template);
  }
}
