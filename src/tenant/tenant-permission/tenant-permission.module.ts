import { Module } from '@nestjs/common';
import { TenantPermissionService } from './tenant-permission.service';
import { TenantPermissionController } from './tenant-permission.controller';
import { TenantPermissionResolver } from './tenant-permission.resolver';
import { PrismaService } from '@prisma-service/prisma.service';

@Module({
  providers: [TenantPermissionService, TenantPermissionResolver, PrismaService],
  controllers: [TenantPermissionController]
})
export class TenantPermissionModule {}
