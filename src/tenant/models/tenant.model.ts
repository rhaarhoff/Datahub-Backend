// src/tenant/models/tenant.model.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '@user-model/user.model';
import { TenantFeatureModel } from '@tenant-feature-model/tenant-feature.model'; 
import { TenantStatus } from '@prisma/client';
import { UserRole } from '@user-role-model/user-role.model';


@ObjectType()
export class Tenant {
  @Field(() => ID) // GraphQL ID type
  id: number;

  @Field()
  name: string;

  @Field({ nullable: true })
  domain?: string;

  @Field(() => TenantStatus)
  status: TenantStatus;

  @Field({ nullable: true })
  subscriptionPlanId?: number;

  @Field({ nullable: true })
  subscriptionStartDate?: Date;

  @Field({ nullable: true })
  subscriptionEndDate?: Date;

  @Field(() => [User])
  users: User[];

  @Field(() => [TenantFeatureModel])
  tenantFeatures: TenantFeatureModel[];

  @Field(() => [UserRole])
  userRoles: UserRole[];

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
