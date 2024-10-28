import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Tenant } from '../../models/tenant.model';
import { Feature } from '../../../feature-access/models/feature-access.model';

@ObjectType()
export class TenantFeatureModel {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  tenantId: number;

  @Field(() => Int)
  featureId: number;

  @Field(() => Boolean, { defaultValue: true })
  enabled: boolean;

  @Field(() => Date)
  subscribedAt: Date;

  @Field(() => Tenant, { nullable: true })
  tenant: Tenant;

  @Field(() => Feature, { nullable: true })
  feature: Feature;
}
