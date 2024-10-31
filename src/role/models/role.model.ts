// src/role/models/role.model.ts
import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Permission } from '@permission-model/permission.model';  // Assuming you have a Permission model
import { UserRole } from '@user-service/user-role/models/user-role.model';  // Assuming you have a UserRole model
import { RoleType } from '@prisma/client';  // Assuming RoleType enum is defined in Prisma

@ObjectType()
export class Role {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;  // Role name, e.g., 'Admin', 'Manager'

  @Field({ nullable: true })
  description?: string;  // Optional description of the role

  @Field(() => RoleType)  // Role type (GLOBAL or TENANT)
  type: RoleType;

  @Field(() => [Permission])  // Permissions associated with the role
  permissions: Permission[];

  @Field(() => [UserRole])  // Users assigned to this role
  userRoles: UserRole[];

  @Field()
  createdAt: Date;  // Timestamp when the role was created

  @Field()
  updatedAt: Date;  // Timestamp when the role was last updated
}
