import { Module } from '@nestjs/common';
import { BullConfigService } from './bull-config.service';

@Module({
  providers: [BullConfigService]
})
export class BullConfigModule {}
