import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // Makes this module global, meaning PrismaService is available application-wide
@Module({
  providers: [PrismaService],
  exports: [PrismaService],  // Export PrismaService so other modules can use it
})
export class PrismaModule {}
