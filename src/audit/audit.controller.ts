import {
    Controller,
    Get,
    Query,
    Param,
    ParseIntPipe,
    DefaultValuePipe,
    Logger,
  } from '@nestjs/common';
  import { AuditService } from './audit.service';
  import { AuditLog } from './interfaces/audit-log.interface';
  import { MaxTakePipe } from '../pipes/max-take/max-take.pipe';
  import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
  
  @Controller('audit')
  export class AuditController {
    private readonly logger = new Logger(AuditController.name);
  
    constructor(
      private readonly auditService: AuditService,
      private readonly casbinHelperService: CasbinHelperService,
    ) {}
  
    @Get()
    async getAllLogs(
      @Query('userId', ParseIntPipe) userId: number,
      @Query('tenantId', ParseIntPipe) tenantId: number,
      @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
      @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100)) take: number, // Max 100
    ): Promise<{ total: number; logs: AuditLog[] }> {
      // Casbin Authorization
      await this.casbinHelperService.enforceAuthorization(userId, '/audit', 'read', tenantId);
  
      this.logger.log(`Fetching audit logs for tenant ${tenantId}`);
      return this.auditService.findAll(skip, take);
    }
  
    @Get(':id')
    async getAuditLog(
      @Param('id', ParseIntPipe) id: number,
      @Query('userId', ParseIntPipe) userId: number,
      @Query('tenantId', ParseIntPipe) tenantId: number,
    ): Promise<AuditLog> {
      // Casbin Authorization
      await this.casbinHelperService.enforceAuthorization(userId, `/audit/${id}`, 'read', tenantId);
  
      this.logger.log(`Fetching audit log with ID ${id} for tenant ${tenantId}`);
      return this.auditService.findOne(id);
    }
  
    @Get('tenant/:tenantId')
    async getLogsByTenant(
      @Param('tenantId', ParseIntPipe) tenantId: number,
      @Query('userId', ParseIntPipe) userId: number,
      @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
      @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100)) take: number, // Max 100
    ): Promise<{ total: number; logs: AuditLog[] }> {
      // Casbin Authorization
      await this.casbinHelperService.enforceAuthorization(userId, `/audit/tenant/${tenantId}`, 'read', tenantId);
  
      this.logger.log(`Fetching audit logs for tenant ${tenantId}`);
      return this.auditService.findLogsByEntity('tenantId', tenantId, skip, take);
    }
  
    @Get('feature/:featureId')
    async getLogsByFeature(
      @Param('featureId', ParseIntPipe) featureId: number,
      @Query('userId', ParseIntPipe) userId: number,
      @Query('tenantId', ParseIntPipe) tenantId: number,
      @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
      @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100)) take: number, // Max 100
    ): Promise<{ total: number; logs: AuditLog[] }> {
      // Casbin Authorization
      await this.casbinHelperService.enforceAuthorization(userId, `/audit/feature/${featureId}`, 'read', tenantId);
  
      this.logger.log(`Fetching audit logs for feature ${featureId}`);
      return this.auditService.findLogsByEntity('featureId', featureId, skip, take);
    }
  
    @Get('user/:userId')
    async getLogsByUser(
      @Param('userId', ParseIntPipe) userId: number,
      @Query('requestingUserId', ParseIntPipe) requestingUserId: number,
      @Query('tenantId', ParseIntPipe) tenantId: number,
      @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
      @Query('take', new DefaultValuePipe(10), ParseIntPipe, new MaxTakePipe(100)) take: number, // Max 100
    ): Promise<{ total: number; logs: AuditLog[] }> {
      // Casbin Authorization
      await this.casbinHelperService.enforceAuthorization(requestingUserId, `/audit/user/${userId}`, 'read', tenantId);
  
      this.logger.log(`Fetching audit logs for user ${userId} in tenant ${tenantId}`);
      return this.auditService.findLogsByEntity('userId', userId, skip, take);
    }
  }
  