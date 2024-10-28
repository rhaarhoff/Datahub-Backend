import { Module } from '@nestjs/common';
import { QuickbooksApiService } from './quickbooks-api/quickbooks-api.service';
import { QuickbooksAuthService } from './quickbooks-auth/quickbooks-auth.service';
import { QuickbooksController } from './quickbooks/quickbooks.controller';

@Module({
  providers: [QuickbooksApiService, QuickbooksAuthService],
  controllers: [QuickbooksController]
})
export class QuickbooksModule {}
