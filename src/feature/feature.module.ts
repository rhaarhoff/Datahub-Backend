import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { FeatureResolver } from './feature.resolver';
import { FeatureController } from './feature.controller';

@Module({
  providers: [FeatureResolver, FeatureService],
  controllers: [FeatureController],
})
export class FeatureModule {}
