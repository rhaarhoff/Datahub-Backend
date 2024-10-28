import { Module } from '@nestjs/common';
import { PermissionService } from '@permission-service/permission.service';
import { PermissionController } from '@permission-service/permission.controller';
import { PermissionResolver } from '@permission-resolver/permission.resolver';
import { PrismaService } from '@prisma-service/prisma.service';
import { CasbinService,  } from '@casbin/casbin.service';
import { PrismaAdapterService } from '@casbin/prisma-adapter.service';

@Module({
  imports: [],
  controllers: [PermissionController],
  providers: [
    PermissionService,
    PermissionResolver,
    PrismaService,
    CasbinService,
    PrismaAdapterService,
  ],
  exports: [PermissionService, CasbinService],
})
export class PermissionModule {}