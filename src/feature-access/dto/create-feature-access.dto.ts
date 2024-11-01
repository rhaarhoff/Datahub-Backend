import { IsInt, IsEnum, IsNotEmpty } from 'class-validator';
import { AccessLevel } from '@prisma/client';

export class CreateFeatureAccessDto {
  @IsInt()
  @IsNotEmpty()
  userRoleId: number;

  @IsInt()
  @IsNotEmpty()
  featureId: number;

  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @IsEnum(AccessLevel)
  @IsNotEmpty()
  accessLevel: AccessLevel; // Values: NONE, VIEW, EDIT, MANAGE
}
