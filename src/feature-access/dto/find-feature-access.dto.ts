import { IsInt, IsEnum, IsOptional } from 'class-validator';
import { AccessLevel } from '@prisma/client';

export class FindFeatureAccessDto {
  @IsInt()
  @IsOptional()
  userRoleId?: number;

  @IsInt()
  @IsOptional()
  featureId?: number;

  @IsInt()
  @IsOptional()
  tenantId?: number;

  @IsEnum(AccessLevel)
  @IsOptional()
  accessLevel?: AccessLevel;
}
