import { Module } from '@nestjs/common';
import { MessagingProviderService } from './messaging-provider.service';

@Module({
  providers: [MessagingProviderService]
})
export class MessagingModule {}
