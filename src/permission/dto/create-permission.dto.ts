// src/permission/dto/create-permission.dto.ts
import { IsString, IsEnum } from 'class-validator';
import { PermissionType } from '@prisma/client';

export class CreatePermissionDto {
  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsEnum(PermissionType)
  type: PermissionType;

  @IsString()
  resource: string;

  @IsString()
  action: string;
}
