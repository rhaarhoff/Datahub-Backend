import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function createUserWithRole(email: string, name: string, roleId: number, tenantId: number, plainPassword: string) {
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  return prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      tenants: { create: { tenantId } },
      roles: { create: { tenantId, roleId, isPrimaryRole: true } },
    },
  });
}
