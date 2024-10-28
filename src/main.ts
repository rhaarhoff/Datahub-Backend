import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
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

  // Start HTTP server on a dynamic port (or default to 3000)
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`HTTP server running on: ${await app.getUrl()}`);
  console.log('Swagger available at /api');

  // Graceful shutdown hooks for microservice and HTTP server
  app.enableShutdownHooks();

  // Connect and start the Redis microservice
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      retryAttempts: 5,
      retryDelay: 1000,
    },
  });

  await microservice.listen();
  console.log('Redis microservice is listening for messages');
}

bootstrap();
