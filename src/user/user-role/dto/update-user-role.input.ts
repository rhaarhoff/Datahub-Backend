// src/user-role/dto/update-user-role.input.ts
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateUserRoleInput } from './create-user-role.input';

@InputType()
export class UpdateUserRoleInput extends PartialType(CreateUserRoleInput) {
  @Field(() => Int)
  id: number;
}