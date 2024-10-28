import { Module } from '@nestjs/common';
import { TenantFeatureService } from './tenant-feature.service';
import { TenantFeatureResolver } from './tenant-feature.resolver';
import { TenantFeatureController } from './tenant-feature.controller';

@Module({
  providers: [TenantFeatureResolver, TenantFeatureService],
  controllers: [TenantFeatureController],
})
export class TenantFeatureModule {}
