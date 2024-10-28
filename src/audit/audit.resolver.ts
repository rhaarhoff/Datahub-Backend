import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { AuditService } from './audit.service';
import { AuditLogModel } from './models/audit-log.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'; // Assuming there's an auth guard

@Resolver(() => AuditLogModel)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  // Fetch all audit logs with pagination and sorting
  @Query(() => [AuditLogModel])
  @UseGuards(GqlAuthGuard) // Optional, in case authentication is required
  async auditLogs(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 10 }) take: number,
    @Args('orderBy', { type: () => String, nullable: true, defaultValue: 'desc' }) orderBy: 'asc' | 'desc',
  ) {
    try {
      return this.auditService.findAll(skip, take, orderBy);
    } catch (error) {
      throw new Error(`Error fetching audit logs: ${error.message}`);
    }
  }

  // Fetch a specific audit log by its ID
  @Query(() => AuditLogModel)
  @UseGuards(GqlAuthGuard)
  async auditLog(@Args('id', { type: () => Int }) id: number) {
    try {
      return this.auditService.findOne(id);
    } catch (error) {
      throw new Error(`Error fetching audit log with ID ${id}: ${error.message}`);
    }
  }

  // Fetch audit logs by specific entity (tenant, feature, user)
  private async auditLogsByEntity(
    entity: 'tenantId' | 'featureId' | 'userId',
    entityId: number,
    skip: number,
    take: number,
    orderBy: 'asc' | 'desc',
  ) {
    try {
      return this.auditService.findLogsByEntity(entity, entityId, skip, take, orderBy);
    } catch (error) {
      throw new Error(`Error fetching audit logs for ${entity} ${entityId}: ${error.message}`);
    }
  }

  // Fetch audit logs for a specific tenant with pagination and sorting
  @Query(() => [AuditLogModel])
  @UseGuards(GqlAuthGuard)
  async auditLogsByTenant(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 10 }) take: number,
    @Args('orderBy', { type: () => String, nullable: true, defaultValue: 'desc' }) orderBy: 'asc' | 'desc',
  ) {
    return this.auditLogsByEntity('tenantId', tenantId, skip, take, orderBy);
  }

  // Fetch audit logs for a specific feature with pagination and sorting
  @Query(() => [AuditLogModel])
  @UseGuards(GqlAuthGuard)
  async auditLogsByFeature(
    @Args('featureId', { type: () => Int }) featureId: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 10 }) take: number,
    @Args('orderBy', { type: () => String, nullable: true, defaultValue: 'desc' }) orderBy: 'asc' | 'desc',
  ) {
    return this.auditLogsByEntity('featureId', featureId, skip, take, orderBy);
  }

  // Fetch audit logs for a specific user with pagination and sorting
  @Query(() => [AuditLogModel])
  @UseGuards(GqlAuthGuard)
  async auditLogsByUser(
    @Args('userId', { type: () => Int }) userId: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 10 }) take: number,
    @Args('orderBy', { type: () => String, nullable: true, defaultValue: 'desc' }) orderBy: 'asc' | 'desc',
  ) {
    return this.auditLogsByEntity('userId', userId, skip, take, orderBy);
  }
}
