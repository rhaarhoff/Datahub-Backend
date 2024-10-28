import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateUserDto } from '@user-dto/create-user.dto';
import { UpdateUserDto } from '@user-dto/update-user.dto';

const prisma = new PrismaClient();

@Injectable()
export class UserService {
  // Create a new user
  async create(createUserDto: CreateUserDto) {
    return prisma.user.create({ data: createUserDto });
  }

  // Get all users, excluding soft-deleted ones
  async findAll() {
    return prisma.user.findMany({
      where: {
        deletedAt: null,  // Exclude soft-deleted users
      },
    });
  }

  // Get a single user by ID, ensuring it's not soft-deleted
  async findOne(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found or has been deleted`);
    }

    return user;
  }

  // Update a user
  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found or has been deleted`);
    }

    return prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  // Soft delete a user
  async softDelete(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${id} not found or already deleted`);
    }

    // Perform soft delete by setting the deletedAt field to the current timestamp
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Restore a soft-deleted user
  async restore(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user?.deletedAt) {
      throw new NotFoundException(`User with ID ${id} is not deleted or not found`);
    }

    // Restore user by setting deletedAt to null
    return prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
