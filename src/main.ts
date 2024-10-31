import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { TenantGuard } from './common/guards/tenant.guard'; 
import { PrismaService } from './prisma/prisma.service'; 
import { TenantService } from './tenant/tenant.service'; 

async function bootstrap() {
  try {
    // Create the main application
    const app = await NestFactory.create(AppModule);

    // Global validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );

    // Enable CORS with dynamic origins
    app.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Swagger setup
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API documentation for the system')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Enable URI versioning
    app.enableVersioning({
      type: VersioningType.URI,
    });

    // Apply the TenantGuard globally
    const tenantService = app.get(TenantService);
    const prismaService = app.get(PrismaService);
    app.useGlobalGuards(new TenantGuard(tenantService, prismaService));

    // Start the HTTP server
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`HTTP server running on: ${await app.getUrl()}`);
    console.log('Swagger available at /api');

    // Enable graceful shutdown hooks
    app.enableShutdownHooks();
    prismaService.enableShutdownHooks(app); // Enable Prisma shutdown hooks

    // Set up the Redis microservice
    setupMicroservice(app);
  } catch (error) {
    console.error('Error during application bootstrap:', error);
    process.exit(1); // Exit the process with failure
  }
}

function setupMicroservice(app) {
  const microservice = app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      retryAttempts: 5,
      retryDelay: 1000,
    },
  } as MicroserviceOptions);

  microservice.listen(() => {
    console.log('Redis microservice is listening for messages');
  });
}

bootstrap();
