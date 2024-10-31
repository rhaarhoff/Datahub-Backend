// src/user-role/dto/create-user-role.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateUserRoleInput {
  @Field(() => Int)
  userId: number;

  @Field(() => Int, { nullable: true })
  tenantId?: number;

  @Field(() => Int)
  roleId: number;

  @Field(() => Boolean, { defaultValue: false })
  isPrimaryRole?: boolean;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;
}