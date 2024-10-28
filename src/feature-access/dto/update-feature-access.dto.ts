import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { AccessLevel } from '@prisma/client';

export class UpdateFeatureAccessDto {
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @IsNotEmpty()
  featureId: number;

  @IsNotEmpty()
  tenantId: number;

  @IsNotEmpty()
  userRoleId: number;
}
