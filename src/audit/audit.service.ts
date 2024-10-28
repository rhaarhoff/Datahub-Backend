import {
    Injectable,
    Logger,
    InternalServerErrorException,
    BadRequestException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { LogActionParams } from './interfaces/log-action.interface';
  import { AuditLogNotFoundException } from '../common/exceptions/audit-log-not-found.exception';
  import { InvalidDateRangeException } from '../common/exceptions/invalid-date-range.exception';
  import { AuditLogFilter } from './interfaces/audit-log-filter.interface';
  import { AuditAction } from './interfaces/audit-action.enum';
  import { AuditLog } from './interfaces/audit-log.interface';
  
  @Injectable()
  export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private readonly maxTake = 100; // Maximum records per pagination request
  
    constructor(private readonly prisma: PrismaService) {}
  
    // Fetch all audit logs with dynamic filtering, sorting, and pagination
    async findAll(
      skip: number = 0,
      take: number = 10,
      orderBy: 'asc' | 'desc' = 'desc',
      filter: AuditLogFilter = {},
    ): Promise<{ total: number; logs: AuditLog[] }> {
      const adjustedTake = Math.min(Math.max(take, 1), this.maxTake);
      const adjustedSkip = Math.max(skip, 0);
  
      try {
        const where = this.buildWhereClause(filter);
  
        const totalLogs = await this.prisma.auditLog.count({ where });
        const logs = await this.prisma.auditLog.findMany({
          where,
          include: {
            user: true,
            tenant: true,
            feature: true,
          },
          skip: adjustedSkip,
          take: adjustedTake,
          orderBy: { timestamp: orderBy },
        });
  
        return { total: totalLogs, logs };
      } catch (error) {
        if (error instanceof InvalidDateRangeException) {
          this.logger.warn('Invalid date range provided', error.message);
          throw error; // Re-throw InvalidDateRangeException without converting it
        }
        this.logger.error('Failed to fetch audit logs', error.stack);
        throw new InternalServerErrorException('Could not retrieve audit logs.');
      }
    }
  
    // Generic method for fetching logs by user, tenant, or feature
    async findLogsByEntity(
      entity: 'userId' | 'tenantId' | 'featureId',
      entityId: number,
      skip: number = 0,
      take: number = 10,
      orderBy: 'asc' | 'desc' = 'desc',
      filter: AuditLogFilter = {},
    ): Promise<{ total: number; logs: AuditLog[] }> {
      const adjustedTake = Math.min(Math.max(take, 1), this.maxTake);
      const adjustedSkip = Math.max(skip, 0);
  
      try {
        const where = { ...this.buildWhereClause(filter), [entity]: entityId };
  
        const totalLogs = await this.prisma.auditLog.count({ where });
        const logs = await this.prisma.auditLog.findMany({
          where,
          include: {
            user: true,
            tenant: true,
            feature: true,
          },
          skip: adjustedSkip,
          take: adjustedTake,
          orderBy: { timestamp: orderBy },
        });
  
        return { total: totalLogs, logs };
      } catch (error) {
        this.logger.error(
          `Failed to fetch audit logs for ${entity} ID: ${entityId}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          `Could not retrieve audit logs for the ${entity}.`,
        );
      }
    }
  
    // Fetch audit logs by specific ID (user, tenant, or feature)
    async findByUser(userId: number, skip = 0, take = 10, orderBy: 'asc' | 'desc' = 'desc', filter: AuditLogFilter = {}) {
      return this.findLogsByEntity('userId', userId, skip, take, orderBy, filter);
    }
  
    async findByTenant(tenantId: number, skip = 0, take = 10, orderBy: 'asc' | 'desc' = 'desc', filter: AuditLogFilter = {}) {
      return this.findLogsByEntity('tenantId', tenantId, skip, take, orderBy, filter);
    }
  
    async findByFeature(featureId: number, skip = 0, take = 10, orderBy: 'asc' | 'desc' = 'desc', filter: AuditLogFilter = {}) {
      return this.findLogsByEntity('featureId', featureId, skip, take, orderBy, filter);
    }
  
    // Fetch a specific audit log by ID, including relational data
    async findOne(id: number) {
      try {
        const auditLog = await this.prisma.auditLog.findUnique({
          where: { id },
          include: {
            user: true,
            tenant: true,
            feature: true,
          },
        });
  
        if (!auditLog) {
          // Explicitly throw AuditLogNotFoundException when log is not found
          throw new AuditLogNotFoundException(id);
        }
  
        return auditLog;
      } catch (error) {
        if (error instanceof AuditLogNotFoundException) {
          throw error; // Re-throw AuditLogNotFoundException without converting it
        }
        this.logger.error(
          `Failed to fetch audit log with ID: ${id}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          'Could not retrieve the audit log.',
        );
      }
    }
  
    // Build the 'where' clause for filtering audit logs
    private buildWhereClause(filter: AuditLogFilter) {
      const { action, userId, tenantId, featureId, startDate, endDate } = filter;
  
      // Validate date range early
      if (startDate && endDate && startDate > endDate) {
        throw new InvalidDateRangeException(); // Ensure this is thrown before Prisma call
      }
  
      // Build dynamic where clause for Prisma queries
      const where: any = {};
  
      if (action) {
        where.action = action;
      }
  
      if (userId) {
        where.userId = userId;
      }
  
      if (tenantId) {
        where.tenantId = tenantId;
      }
  
      if (featureId) {
        where.featureId = featureId;
      }
  
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = startDate;
        }
        if (endDate) {
          where.timestamp.lte = endDate;
        }
      }
  
      return where;
    }
  
    // Generic logging function with additional metadata (IP address, user agent)
    async logAction(params: LogActionParams) {
      const {
        action,
        userId,
        tenantId,
        featureId,
        before,
        after,
        ipAddress,
        userAgent,
        modifiedFields,
      } = params;
  
      // Ensure action and userId are present
      if (!action || !userId) {
        this.logger.error('Audit log requires an action and a userId.');
        throw new BadRequestException('Action and User ID are required.');
      }
  
      // Validate action against the AuditAction enum
      this.logger.debug(
        `Validating action: ${action} against ${JSON.stringify(Object.values(AuditAction))}`,
      );
      if (!Object.values(AuditAction).includes(action)) {
        this.logger.error(`Invalid audit action: ${action}`);
        throw new BadRequestException(`Invalid audit action: ${action}`);
      }
  
      // Only proceed with Prisma operations after validation passes
      try {
        await this.prisma.auditLog.create({
          data: {
            action,
            userId,
            ...(tenantId && { tenantId }),
            ...(featureId && { featureId }),
            before: before ? JSON.stringify(before) : null,
            after: after ? JSON.stringify(after) : null,
            ipAddress: ipAddress || 'Unknown IP',
            userAgent: userAgent || 'Unknown Agent',
            modifiedFields: modifiedFields ? JSON.stringify(modifiedFields) : null,
          },
        });
        this.logger.log(`Audit log created for action: ${action}`);
      } catch (error) {
        this.logger.error(
          `Failed to create audit log for action: ${action}`,
          error.stack,
        );
        throw new InternalServerErrorException('Could not log the action.');
      }
    }
  
    // Batch log actions for performance optimization
    async batchLogActions(actions: LogActionParams[]) {
      // Ensure we have valid data to process
      if (!actions || actions.length === 0) {
        this.logger.warn('No audit log actions provided for batch logging.');
        throw new BadRequestException('No audit log actions to process.');
      }
  
      // Validate all actions before processing
      const invalidActions = actions.filter(
        (action) => !Object.values(AuditAction).includes(action.action),
      );
      if (invalidActions.length > 0) {
        this.logger.error(
          `Invalid audit actions found: ${invalidActions.map((a) => a.action).join(', ')}`,
        );
        throw new BadRequestException(
          `Invalid audit actions: ${invalidActions.map((a) => a.action).join(', ')}`,
        );
      }
  
      // Prepare data for bulk insertion after validation
      const logs = actions.map((action) => ({
        action: action.action,
        userId: action.userId,
        tenantId: action.tenantId || null,
        featureId: action.featureId || null,
        before: action.before ? JSON.stringify(action.before) : null,
        after: action.after ? JSON.stringify(action.after) : null,
        ipAddress: action.ipAddress || 'Unknown IP',
        userAgent: action.userAgent || 'Unknown Agent',
      }));
  
      if (logs.length === 0) {
        this.logger.warn('All provided actions were invalid, no logs to insert.');
        return;
      }
  
      try {
        // Perform batch insertion with Prisma
        await this.prisma.auditLog.createMany({
          data: logs,
          skipDuplicates: true, // Skip duplicates based on unique constraints
        });
        this.logger.log(`Successfully logged ${logs.length} actions.`);
      } catch (error) {
        this.logger.error(
          `Failed to batch log actions: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          'Could not log the batch actions.',
        );
      }
    }
  }
  