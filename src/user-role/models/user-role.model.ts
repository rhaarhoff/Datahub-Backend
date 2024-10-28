// src/user-role/models/user-role.model.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '@user-model/user.model';
import { Tenant } from '@tenant-model/tenant.model';
import { Role } from '@role-model/role.model';

@ObjectType()
export class UserRole {
  @Field(() => ID)
  id: number;

  @Field(() => User)
  user: User;  // Relationship to User

  @Field(() => Tenant, { nullable: true })  // Nullable for global roles
  tenant?: Tenant;  // Relationship to Tenant (if role is tenant-specific)

  @Field(() => Role)
  role: Role;  // Relationship to Role

  @Field(() => Boolean, { defaultValue: false })
  isPrimaryRole: boolean;  // Whether this is the user's primary role

  @Field()
  startDate: Date;  // When the role was assigned

  @Field({ nullable: true })
  endDate?: Date;  // When the role assignment ends

  @Field()
  createdAt: Date;  // Creation timestamp

  @Field()
  updatedAt: Date;  // Last update timestamp
}