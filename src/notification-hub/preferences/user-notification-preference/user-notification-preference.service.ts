// src/notification-hub/preferences/user-notification-preference.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { UserNotificationPreference } from '@prisma/client';
import { ServiceLog } from '../../../common/decorators/service-log/service-log.decorator';

@Injectable()
export class UserNotificationPreferenceService {
  private readonly logger = new Logger(UserNotificationPreferenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches the notification preferences for a specific user and tenant.
   */
  @ServiceLog('Fetching user preferences')
  async getUserPreferences(
    userId: number,
    tenantId: number,
    messageType: string = 'default'
  ): Promise<UserNotificationPreference | null> {
    try {
      const preferences = await this.prisma.userNotificationPreference.findUnique({
        where: { userId_tenantId_messageType: { userId, tenantId, messageType } },
      });
      if (!preferences) {
        this.logger.warn(`No preferences found for user: ${userId}, tenant: ${tenantId}, messageType: ${messageType}`);
      } else {
        this.logger.log(`Fetched preferences for user: ${userId}, tenant: ${tenantId}, messageType: ${messageType}`);
      }
      return preferences;
    } catch (error) {
      this.logger.error(`Error fetching preferences for user: ${userId}, tenant: ${tenantId} - ${error.message}`);
      throw new Error('Failed to fetch user notification preferences');
    }
  }

/**
   * Updates the notification preferences for a specific user and tenant.
   */
@ServiceLog('Updating user preferences')
async updateUserPreferences(
  userId: number,
  tenantId: number,
  updates: Partial<Pick<UserNotificationPreference, 'preferredChannels' | 'frequency' | 'consentStatus' | 'doNotDisturb' | 'doNotDisturbStart' | 'doNotDisturbEnd'>>,
  messageType: string = 'default'
): Promise<UserNotificationPreference> {
  try {
    const updateData = {
      preferredChannels: updates.preferredChannels as JsonValue,
      frequency: updates.frequency,
      consentStatus: updates.consentStatus,
      doNotDisturb: updates.doNotDisturb,
      doNotDisturbStart: updates.doNotDisturbStart,
      doNotDisturbEnd: updates.doNotDisturbEnd,
    };

    const updatedPreferences = await this.prisma.userNotificationPreference.upsert({
      where: { userId_tenantId_messageType: { userId, tenantId, messageType } },
      update: updateData,
      create: {
        userId,
        tenantId,
        messageType,
        ...updateData,
      },
    });

    this.logger.log(`Preferences updated for user: ${userId}, tenant: ${tenantId}, messageType: ${messageType}`);
    return updatedPreferences;
  } catch (error) {
    this.logger.error(`Error updating preferences for user ${userId}, tenant ${tenantId}: ${error.message}`);
    throw new Error('Failed to update user notification preferences');
  }
}

  /**
   * Checks if the user has consented to receive notifications.
   */
  @ServiceLog('Checking user consent')
  async hasUserConsented(userId: number, tenantId: number): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId, tenantId);
      return preferences ? preferences.consentStatus : false;
    } catch (error) {
      this.logger.error(`Error checking consent status for user ${userId}, tenant ${tenantId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Checks if the user's Do Not Disturb (DND) setting is active.
   */
  @ServiceLog('Checking Do Not Disturb status')
  async isDoNotDisturbActive(userId: number, tenantId: number): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId, tenantId);
    if (!preferences) return false;
    const now = new Date();
    const { doNotDisturb, doNotDisturbStart, doNotDisturbEnd } = preferences;
    return doNotDisturb && doNotDisturbStart && doNotDisturbEnd && now >= doNotDisturbStart && now <= doNotDisturbEnd;
  }

  /**
   * Updates the Do Not Disturb (DND) settings for a user.
   */
  @ServiceLog('Updating Do Not Disturb settings')
  async updateDoNotDisturb(
    userId: number,
    tenantId: number,
    doNotDisturb: boolean,
    doNotDisturbStart?: Date,
    doNotDisturbEnd?: Date
  ): Promise<UserNotificationPreference> {
    return this.updateUserPreferences(userId, tenantId, { doNotDisturb, doNotDisturbStart, doNotDisturbEnd });
  }

  /**
   * Fetches preferences for multiple users under a specific tenant and message type.
   */
  @ServiceLog('Fetching preferences for multiple users')
  async getPreferencesForUsers(
    userIds: number[],
    tenantId: number,
    messageType: string = 'default'
  ): Promise<UserNotificationPreference[]> {
    try {
      return await this.prisma.userNotificationPreference.findMany({
        where: {
          tenantId,
          userId: { in: userIds },
          messageType,
        },
      });
    } catch (error) {
      this.logger.error(`Error fetching preferences for users in tenant ${tenantId}: ${error.message}`);
      throw new Error('Failed to fetch user notification preferences');
    }
  }
}
