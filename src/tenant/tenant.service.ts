import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Set tenant and user context in PostgreSQL for RLS
   */
  async setTenantAndUser(tenantId: number, userId: number): Promise<void> {
    // Set the tenant and user in PostgreSQL session for RLS
    await this.prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
    await this.prisma.$executeRaw`SET app.current_user_id = ${userId}`;
  }

  // Find tenant by user ID (tenant context should be determined after user login)
  async findTenantForUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      throw new Error('User does not belong to any tenant');
    }

    return user.tenants;
  }

  async create(createTenantDto: any) {
    return this.prisma.tenant.create({ data: createTenantDto });
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findOne(id: number) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async update(id: number, updateTenantDto: any) {
    return this.prisma.tenant.update({ where: { id }, data: updateTenantDto });
  }

  async remove(id: number) {
    return this.prisma.tenant.delete({ where: { id } });
  }
}
