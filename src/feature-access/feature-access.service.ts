import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AccessLevel } from '@prisma/client';
import { CacheClearException } from '../common/exceptions/cache-clear.exception';
import { UpdateFeatureAccessDto } from './dto/update-feature-access.dto';
import * as retry from 'async-retry';
import { ServiceLog } from '@decorators/service-log/service-log.decorator';

@Injectable()
export class FeatureAccessService {
  private readonly logger = new Logger(FeatureAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly auditService: AuditService,
  ) { }

  private determineAccessLevel(roleName: string): AccessLevel {
    const accessLevelMap: { [key: string]: AccessLevel } = {
      ADMIN: AccessLevel.MANAGE,
      MEMBER: AccessLevel.EDIT,
      GUEST: AccessLevel.VIEW,
    };
    return accessLevelMap[roleName] || AccessLevel.VIEW;
  }

  private async findFeatureAccessOrThrow(featureId: number, tenantId: number, userRoleId: number) {
    const featureAccess = await this.prisma.featureAccess.findUnique({
      where: {
        FeatureAccessCompositeKey: { featureId, tenantId, userRoleId },
      },
    });

    if (!featureAccess || featureAccess.deletedAt) {
      throw new NotFoundException(`Feature access not found or is deleted for feature ID ${featureId}, tenant ID ${tenantId}, and user role ID ${userRoleId}`);
    }
    return featureAccess;
  }

  @ServiceLog('Retrieve feature access')
  async getFeatureAccess(featureId: number, tenantId: number, userRoleId: number, userId: number, ipAddress: string, userAgent: string) {
    const featureAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    await this.logAuditAction({
      action: AuditAction.ACCESS_FEATURE,
      userId,
      tenantId,
      featureId,
      before: null,
      after: featureAccess,
      ipAddress,
      userAgent,
    });

    return featureAccess;
  }

  @ServiceLog('Update feature access level')
  async updateFeatureAccess(featureId: number, tenantId: number, userRoleId: number, userId: number, accessData: UpdateFeatureAccessDto, ipAddress: string, userAgent: string) {
    if (!accessData?.accessLevel || !featureId || !tenantId || !userRoleId) {
      throw new BadRequestException(`Invalid access data provided for feature update`);
    }
    
    const existingAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    const updatedAccess = await this.prisma.featureAccess.update({
      where: { FeatureAccessCompositeKey: { featureId, tenantId, userRoleId } },
      data: { accessLevel: accessData.accessLevel },
    });

    await this.logAuditAction({
      action: AuditAction.UPDATE_FEATURE_ACCESS,
      userId,
      tenantId,
      featureId,
      before: existingAccess,
      after: updatedAccess,
      ipAddress,
      userAgent,
      modifiedFields: ['accessLevel'],
    });

    return updatedAccess;
  }  

  @ServiceLog('Clear feature access')
  async clearFeatureAccess(featureId: number, tenantId: number, userRoleId: number, userId: number, ipAddress: string, userAgent: string) {
    const existingAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    await this.prisma.featureAccess.update({
      where: { FeatureAccessCompositeKey: { featureId, tenantId, userRoleId } },
      data: { deletedAt: new Date() },
    });

    await this.logAuditAction({
      action: AuditAction.CLEAR_FEATURE_ACCESS,
      userId,
      tenantId,
      featureId,
      before: existingAccess,
      after: null,
      ipAddress,
      userAgent,
    });

    await this.retryCacheInvalidation(tenantId, featureId);
  }

  private async retryCacheInvalidation(tenantId: number, featureId: number) {
    try {
      await retry(async () => {
        await this.cacheManagerService.invalidateFeatureCache(tenantId, featureId);
      }, {
        retries: 2,
        onRetry: (err, attempt) => this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${(err as Error).message}`),
      });
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
      throw new CacheClearException(`Failed to clear cache for tenant ${tenantId} and feature ${featureId}`, errorMessage);
    }
  }

  private async logAuditAction({ action, userId, tenantId, featureId, before, after, ipAddress, userAgent, modifiedFields }: {
    action: AuditAction;
    userId: number;
    tenantId: number;
    featureId: number;
    before: any;
    after: any;
    ipAddress: string;
    userAgent: string;
    modifiedFields?: string[];
  }) {
    try {
      await this.auditService.logAction({
        action,
        userId,
        tenantId,
        featureId,
        before,
        after,
        ipAddress,
        userAgent,
        modifiedFields,
      });
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
      this.logger.error(`Failed to log audit action for feature ${featureId}: ${errorMessage}`);
    }
  }
}
