import { Module } from '@nestjs/common';
import { DeadLetterService } from './dead-letter.service';

@Module({
  providers: [DeadLetterService]
})
export class DeadLetterModule {}
