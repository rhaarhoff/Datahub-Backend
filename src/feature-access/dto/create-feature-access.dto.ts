import { IsInt, IsEnum } from 'class-validator';
import { AccessLevel } from '@prisma/client';

export class CreateFeatureAccessDto {
  @IsInt()
  userRoleId: number;

  @IsInt()
  featureId: number;

  @IsInt()
  tenantId: number;

  @IsEnum(AccessLevel)
  accessLevel: AccessLevel; // Values: NONE, VIEW, EDIT, MANAGE
}