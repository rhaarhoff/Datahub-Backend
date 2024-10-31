// src/user-role/dto/update-user-role.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRoleDto } from './create-user-role.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {
  @ApiProperty({ description: 'User Role ID', example: 1 })
  @IsInt()
  id: number;
}