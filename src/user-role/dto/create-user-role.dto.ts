// src/user-role/dto/create-user-role.dto.ts
import { IsBoolean, IsInt, IsOptional, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserRoleDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Tenant ID', example: 101, required: false })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @ApiProperty({ description: 'Role ID', example: 2 })
  @IsInt()
  roleId: number;

  @ApiProperty({ description: 'Is Primary Role', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPrimaryRole?: boolean = false;

  @ApiProperty({ description: 'Start Date', example: '2024-01-01T00:00:00Z', required: false })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'End Date', example: '2024-12-31T23:59:59Z', required: false })
  @IsDate()
  @IsOptional()
  endDate?: Date;
}