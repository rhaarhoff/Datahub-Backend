import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../prisma/prisma-health.indicator'; // Custom Prisma Health Check

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator, // Custom Prisma Health Check
  ) {}

  @Get()
  @HealthCheck()
  checkAll() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
      () => this.prismaHealth.isHealthy('prisma'),  // Custom health check for Prisma
    ]);
  }

  @Get('prisma')
  @HealthCheck()
  checkPrisma() {
    return this.health.check([() => this.prismaHealth.isHealthy('prisma')]);
  }
}
