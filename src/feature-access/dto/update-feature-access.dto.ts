import { IsEnum, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { AccessLevel } from '@prisma/client';

export class UpdateFeatureAccessDto {
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @IsInt()
  @IsNotEmpty()
  featureId: number;

  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @IsInt()
  @IsNotEmpty()
  userRoleId: number;
}
