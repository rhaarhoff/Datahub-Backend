// src/tenant/tenant.module.ts
import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TenantController } from './tenant.controller';
import { TenantResolver } from './tenant.resolver';
import { TenantRoleModule } from './tenant-role/tenant-role.module';
import { TenantPermissionModule } from './tenant-permission/tenant-permission.module';

@Module({
  imports: [TenantRoleModule, TenantPermissionModule], // Import the TenantRoleModule
  providers: [TenantService, TenantGuard, PrismaService, TenantResolver], // Provide the services and guards
  exports: [TenantService, TenantGuard], controllers: [TenantController], // Export services and guards so other modules can use them
})
export class TenantModule {}
