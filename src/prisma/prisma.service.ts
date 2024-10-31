import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<Prisma.PrismaClientOptions, 'beforeExit'> implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();  // Gracefully close the application
    });
  }
}
