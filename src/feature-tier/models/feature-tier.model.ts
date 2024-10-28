// src/feature-tier/models/feature-tier.model.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Feature } from '../../feature-access/models/feature-access.model';

@ObjectType()
export class FeatureTierModel {
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

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => [Feature], { nullable: true })
  features?: Feature[];
}
