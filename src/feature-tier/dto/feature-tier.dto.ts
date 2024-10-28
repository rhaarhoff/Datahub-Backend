// src/feature-tier/dto/feature-tier.dto.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class FeatureTierDto {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
