import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { FeatureModule } from './feature/feature.module';
import { TenantFeatureModule } from './tenant/tenant-feature/tenant-feature.module';
import { SubscriptionPlanModule } from './subscription-plan/subscription-plan.module';
import { CasbinModule } from './casbin-integration/casbin.module';
import { PermissionModule } from './permission/permission.module';
import { RoleModule } from './role/role.module';
import { UserRoleModule } from './user-role/user-role.module';
import { FeatureAccessService } from './feature-access/feature-access.service';
import { SubscriptionService } from './subscription/subscription.service';
import { SubscriptionController } from './subscription/subscription.controller';
import { SubscriptionResolver } from './subscription/subscription.resolver';
import { CacheService } from './cache/cache.service';
import { RedisCacheModule } from './cache/cache.module'; // Your custom CacheModule
import { FeatureAccessModule } from './feature-access/feature-access.module';
import { FeatureTierService } from './feature-tier/feature-tier.service';
import { FeatureTierController } from './feature-tier/feature-tier.controller';
import { FeatureTierResolver } from './feature-tier/feature-tier.resolver';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';
import { AuditResolver } from './audit/audit.resolver';
import { CasbinHelperService } from './casbin-integration/casbin-helper.service';
import { TenantRoleModule } from './tenant/tenant-role/tenant-role.module';

@Module({
  imports: [
    // Redis-based caching module
    NestCacheModule.register({
      store: redisStore,
      host: process.env.REDIS_CACHE_HOST || 'localhost',
      port: parseInt(process.env.REDIS_CACHE_PORT, 10) || 6379,
      ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour default TTL
    }),

    // GraphQL module with auto-schema generation
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),

    // Health Check module (Terminus)
    TerminusModule,

    AuthModule,
    PrismaModule,
    UserModule,
    FeatureModule,
    TenantFeatureModule,
    SubscriptionPlanModule,
    CasbinModule,
    PermissionModule,
    RoleModule,
    UserRoleModule,
    RedisCacheModule,
    FeatureAccessModule,
    TenantRoleModule,
  ],
  controllers: [SubscriptionController, HealthController, FeatureTierController, AuditController],
  providers: [
    FeatureAccessService,
    SubscriptionService,
    SubscriptionResolver,
    CacheService,
    FeatureTierService,
    FeatureTierResolver,
    AuditService,
    AuditResolver,
    CasbinHelperService,
  ],
})
export class AppModule {}
