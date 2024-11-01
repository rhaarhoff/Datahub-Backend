import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Tenant } from '../../tenant/models/tenant.model';
import { Feature } from '../../feature/models/feature.model';
import { UserRole } from '../../user/user-role/models/user-role.model';
import { AccessLevel } from '@prisma/client';
import { IsOptional, IsEnum, IsDate, IsInt } from 'class-validator';

@ObjectType()
export class FeatureAccessModel {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  @IsInt()
  featureId: number;

  @Field(() => Int)
  @IsInt()
  tenantId: number;

  @Field(() => Int)
  @IsInt()
  userRoleId: number;

  @Field(() => AccessLevel)
  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;

  @Field(() => Date)
  @IsDate()
  createdAt: Date;

  @Field(() => Date)
  @IsDate()
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  deletedAt?: Date;

  // Relations
  @Field(() => Feature)
  feature: Feature;

  @Field(() => Tenant)
  tenant: Tenant;

  @Field(() => UserRole)
  userRole: UserRole;
}
