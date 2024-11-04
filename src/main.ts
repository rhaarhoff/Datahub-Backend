// main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { TenantGuard } from './common/guards/tenant.guard';
import { PrismaService } from './prisma/prisma.service';
import { TenantService } from './tenant/tenant.service';
import { AuditService } from './audit/audit.service';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging/audit-logging.interceptor';
import { ServiceLoggingInterceptor } from './common/interceptors/service-logging/service-logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics/metrics.interceptor';
import * as Prometheus from 'prom-client';
import * as express from 'express';
import Redis from 'ioredis';

async function bootstrap() {
  try {
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

    // Register global interceptors
    const reflector = app.get(Reflector);
    const auditService = app.get(AuditService);
    app.useGlobalInterceptors(
      new AuditLoggingInterceptor(auditService, reflector),
      new ServiceLoggingInterceptor(reflector),
      new MetricsInterceptor(),
    );

    // Create a Redis client using ioredis for BullMQ and microservice
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // Start the HTTP server
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`HTTP server running on: ${await app.getUrl()}`);
    console.log('Swagger available at /api');

    // Enable graceful shutdown hooks
    app.enableShutdownHooks();
    prismaService.enableShutdownHooks(app);

    // Set up the Redis microservice
    setupMicroservice(app, redisClient);

    // Configure and serve Prometheus metrics on port 4000
    setupMetricsServer();
  } catch (error) {
    console.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}

function setupMicroservice(app, redisClient: Redis) {
  const microservice = app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: `redis://${redisClient.options.host}:${redisClient.options.port}`,
      retryAttempts: 5,
      retryDelay: 1000,
    },
  } as MicroserviceOptions);

  microservice.listen(() => {
    console.log('Redis microservice is listening for messages');
  });
}

function setupMetricsServer() {
  const metricsApp = express();
  const metricsPort = process.env.METRICS_PORT || 4000;

  Prometheus.collectDefaultMetrics(); // Collect default metrics

  metricsApp.get('/metrics', async (req, res) => {
    res.set('Content-Type', Prometheus.register.contentType);
    res.end(await Prometheus.register.metrics());
  });

  metricsApp.listen(metricsPort, () => {
    console.log(`Prometheus metrics available at http://localhost:${metricsPort}/metrics`);
  });
}

bootstrap();
