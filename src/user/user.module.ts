// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller'; // Import the controller
import { UserResolver } from './user.resolver'; // GraphQL resolver
import { TenantModule } from '../tenant/tenant.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [TenantModule],
  controllers: [UserController], // REST controller
  providers: [UserService, UserResolver, PrismaService], // Service and GraphQL resolver
})
export class UserModule {}
