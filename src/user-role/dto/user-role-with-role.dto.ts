// src/user-role/dto/user-role-with-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject } from 'class-validator';

export class RoleDto {
  @ApiProperty({ description: 'Role name', example: 'ADMIN' })
  @IsNotEmpty()
  name: string;
}

export class UserRoleWithRoleDto {
  @ApiProperty({ description: 'User Role ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;  // Ensure that this ID property exists

  @ApiProperty({ description: 'Tenant ID', example: 101 })
  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @ApiProperty({ description: 'Associated Role' })
  @IsObject()
  @IsNotEmpty()
  role: RoleDto;
}
