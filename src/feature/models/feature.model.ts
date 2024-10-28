import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { TenantFeatureModel } from '@tenant-feature-model/tenant-feature.model';
import { FeatureTierModel } from '../../feature-tier/models/feature-tier.model';
import { SubscriptionPlan } from '../../subscription-plan/models/subscription-plan.model';
import { IsOptional, IsString, Length } from 'class-validator';

@ObjectType()
export class Feature {
  @Field(() => ID) // Use ID type for the primary key, allowing for flexibility in case of switching to UUIDs later.
  id: number;

  @Field() // Non-nullable string field for name
  @IsString()
  @Length(3, 255) // Validation for name to ensure it has a reasonable length
  name: string;

  @Field({ nullable: true }) // Nullable string field for description
  @IsOptional()
  @IsString()
  @Length(0, 1000) // Optional description with a max length to ensure it's not too large
  description?: string;

  @Field(() => FeatureTierModel, { nullable: true }) // Nullable relation to the FeatureTier model, making it optional
  tier?: FeatureTierModel;

  @Field(() => Boolean) // Boolean field for premium flag, required
  isPremium: boolean;

  @Field(() => Boolean) // Boolean field for enabled flag, required
  enabled: boolean;

  @Field(() => [TenantFeatureModel], { nullable: true }) // Relation to TenantFeature model, making the array optional
  tenantFeatures?: TenantFeatureModel[];

  @Field(() => [SubscriptionPlan], { nullable: true }) // Relation to SubscriptionPlan model, making the array optional
  plans?: SubscriptionPlan[];

  @Field({ nullable: true }) // Nullable DateTime field for soft deletion
  deletedAt?: Date;

  @Field() // Non-nullable DateTime field for creation timestamp
  createdAt: Date;

  @Field() // Non-nullable DateTime field for update timestamp
  updatedAt: Date;
}
