import { Module } from '@nestjs/common';
import { FeatureAccessService } from './feature-access.service';
import { FeatureAccessController } from './feature-access.controller';
import { FeatureAccessResolver } from './feature-access.resolver';
import { PrismaService } from '@prisma-service/prisma.service';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [],
  controllers: [FeatureAccessController],
  providers: [FeatureAccessService, FeatureAccessResolver, PrismaService, CacheService],
  exports: [FeatureAccessService],
})
export class FeatureAccessModule {}
