// src/tenant/tenant-role/tenant-role.module.ts
import { Module } from '@nestjs/common';
import { TenantRoleService } from './tenant-role.service';
import { TenantRoleController } from './tenant-role.controller';
import { PrismaService } from '@prisma-service/prisma.service';
import { TenantRoleResolver } from './tenant-role.resolver';

@Module({
  providers: [TenantRoleService, PrismaService, TenantRoleResolver],
  controllers: [TenantRoleController],
  exports: [TenantRoleService],
})
export class TenantRoleModule {}
