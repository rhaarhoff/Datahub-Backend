// src/notification-hub/messaging/messaging-provider.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma-service/prisma.service';
import { MessagingProvider, TenantFeatureNotificationChannel } from '@prisma/client';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class MessagingProviderService {
  private readonly logger = new Logger(MessagingProviderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  /**
   * Retrieve an active provider for the specified tenant, provider type, and integration type.
   */
  async getProvider(tenantId: number, providerType: string, integrationType: string): Promise<MessagingProvider | null> {
    const provider = await this.prisma.messagingProvider.findFirst({
      where: {
        tenantId,
        providerType,
        integrationType,
        isActive: true,
      },
    });

    if (!provider) {
      this.logger.warn(`No active provider found for ${providerType} with integration type ${integrationType}`);
    }
    return provider;
  }

  /**
   * Choose the best provider, falling back if necessary.
   */
  async selectProvider(tenantId: number, providerType: string, integrationType: string): Promise<MessagingProvider> {
    const primaryProvider = await this.getProvider(tenantId, providerType, integrationType);

    if (primaryProvider && this.isProviderHealthy(primaryProvider)) {
      return primaryProvider;
    }

    if (primaryProvider?.fallbackProviderId) {
      const fallbackProvider = await this.prisma.messagingProvider.findUnique({
        where: { id: primaryProvider.fallbackProviderId },
      });
      if (fallbackProvider && this.isProviderHealthy(fallbackProvider)) {
        this.logger.warn(`Fallback to secondary provider for ${providerType} with integration ${integrationType}`);
        return fallbackProvider;
      }
    }

    throw new Error(`No available provider for ${providerType} with integration ${integrationType}`);
  }

  /**
   * Send a message using a selected provider and apply rate-limiting checks.
   */
  async sendMessage(tenantId: number, providerType: string, integrationType: string, userId: number, message: string): Promise<void> {
    const provider = await this.selectProvider(tenantId, providerType, integrationType);

    const rateLimitKey = `rate-limit:${provider.id}`;
    const isRateLimited = await this.checkRateLimit(rateLimitKey, provider);

    if (isRateLimited) {
      throw new Error(`Rate limit exceeded for provider ${providerType} with integration ${integrationType}`);
    }

    try {
      // Decrypt apiKey if stored securely
      const apiKey = this.decrypt(provider.apiKey);
      await axios.post(provider.apiUrl, { message, userId }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      this.logger.log(`Message sent to user ${userId} via ${providerType} (${integrationType})`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      await this.handleFailure(provider);
      throw error;
    }
  }

  /**
   * Verify if the provider is above the health threshold.
   */
  private isProviderHealthy(provider: MessagingProvider): boolean {
    const minHealthScore = this.configService.get<number>('MIN_HEALTH_SCORE', 0.8);
    if (provider.healthScore !== null && provider.healthScore < minHealthScore) {
      this.logger.warn(`Provider ${provider.providerType} is below health threshold.`);
      return false;
    }
    return true;
  }

  /**
   * Reduce provider health score and update the active status.
   */
  private async handleFailure(provider: MessagingProvider) {
    const newHealthScore = Math.max((provider.healthScore || 1) - 0.1, 0);
    await this.prisma.messagingProvider.update({
      where: { id: provider.id },
      data: {
        healthScore: newHealthScore,
        isActive: newHealthScore >= 0.5,
        lastChecked: new Date(),
      },
    });
    this.logger.warn(`Provider ${provider.providerType} health reduced to ${newHealthScore}`);
  }

  /**
   * Check rate limits for a provider, update Redis if necessary.
   */
  private async checkRateLimit(rateLimitKey: string, provider: MessagingProvider): Promise<boolean> {
    const resetInterval = provider.rateResetInterval ?? 3600; // Default to 1 hour in seconds if undefined
    const rateLimit = provider.rateLimit ?? 60; // Default rate limit if undefined

    const currentCount = await this.incrementRateLimit(rateLimitKey, rateLimit, resetInterval);
    if (currentCount > rateLimit) {
      this.logger.warn(`Provider ${provider.providerType} exceeded rate limit`);
      return true;
    }
    return false;
  }

  /**
   * Increment rate limit count in Redis, applying expiration.
   */
  private async incrementRateLimit(rateLimitKey: string, rateLimit: number, resetInterval: number): Promise<number> {
    const currentCount = await this.redisClient.incr(rateLimitKey);
    if (currentCount === 1) {
      await this.redisClient.expire(rateLimitKey, resetInterval);
    }
    return currentCount;
  }

  /**
   * Get fallback provider based on channel configuration.
   */
  async getFallbackProvider(channel: TenantFeatureNotificationChannel): Promise<MessagingProvider | null> {
    if (!channel.fallbackProviderId) {
      return null;
    }
    return await this.prisma.messagingProvider.findUnique({
      where: { id: channel.fallbackProviderId },
    });
  }

  // Utility functions for secure storage
  private encrypt(data: string): string {
    // Implement encryption logic here
    return data; // Placeholder, replace with actual encryption
  }

  private decrypt(encryptedData: string): string {
    // Implement decryption logic here
    return encryptedData; // Placeholder, replace with actual decryption
  }
}
