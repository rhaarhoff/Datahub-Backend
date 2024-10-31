// src/tenant/tenant-permission/models/tenant-permission.model.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TenantRole } from '../../tenant-role/models/tenant-role.model';
import { Tenant } from '../../models/tenant.model';
import { PartialUser, PartialTenantFeature, PartialUserRole } from 'src/common/types/types';

@ObjectType()
export class TenantPermission {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [TenantRole], { nullable: true })
  roles?: TenantRole[];  // Relationship to TenantRole, nullable if not assigned yet

  @Field(() => Int)
  tenantId: number;

  @Field(() => Tenant)
  tenant: {
    users: PartialUser[];
    tenantFeatures: PartialTenantFeature[];
    userRoles: PartialUserRole[];
  }; // Define tenant with partial relations

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;  // Soft delete timestamp
}
