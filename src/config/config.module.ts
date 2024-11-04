import { Module } from '@nestjs/common';
import { AppConfigService } from './config/config.service';

@Module({
  providers: [AppConfigService]
})
export class ConfigModule {}
