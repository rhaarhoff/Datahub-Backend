// src/casbin/casbin.module.ts

import { Module } from '@nestjs/common';
import { CasbinService } from './casbin.service';
import { PrismaAdapterService } from './prisma-adapter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CasbinService, PrismaAdapterService],
  exports: [CasbinService],
})
export class CasbinModule {}
