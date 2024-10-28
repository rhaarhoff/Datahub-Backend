// src/permission/models/permission.model.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Role } from '@role-model/role.model';
import { PermissionType } from '@prisma/client';

@ObjectType()
export class Permission {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;  // Name of the permission (e.g., 'VIEW_USERS', 'EDIT_TENANTS')

  @Field({ nullable: true })
  description?: string;  // Optional description of the permission

  @Field(() => PermissionType)  // Permission type (GLOBAL or TENANT)
  type: PermissionType;

  @Field(() => [Role])  // Roles associated with the permission
  roles: Role[];

  @Field()
  createdAt: Date;  // Timestamp when the permission was created

  @Field()
  updatedAt: Date;  // Timestamp when the permission was last updated
}
