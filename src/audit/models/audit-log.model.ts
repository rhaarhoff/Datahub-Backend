import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../../user/models/user.model';
import { Feature } from '../../feature-access/models/feature-access.model';
import { Tenant } from '../../tenant/models/tenant.model'; // Import Tenant model
import { AuditAction } from '@prisma/client';

@ObjectType()
export class AuditLogModel {
  @Field(() => Int, { description: 'The ID of the audit log entry' })
  id: number;

  @Field(() => AuditAction, { description: 'The type of audit action performed' })
  action: AuditAction;

  // Relating to the User entity
  @Field(() => Int, { description: 'The ID of the user who performed the action' })
  userId: number;

  @Field(() => User, { description: 'The user who performed the action' })
  user: User;

  // Relating to the Tenant entity
  @Field(() => Int, { nullable: true, description: 'The ID of the tenant, if applicable' })
  tenantId?: number;

  @Field(() => Tenant, { nullable: true, description: 'The tenant involved in the action, if applicable' })
  tenant?: Tenant;

  // Relating to the Feature entity
  @Field(() => Int, { nullable: true, description: 'The ID of the feature, if applicable' })
  featureId?: number;

  @Field(() => Feature, { nullable: true, description: 'The feature involved in the action, if applicable' })
  feature?: Feature;

  @Field(() => String, { nullable: true, description: 'The state of the entity before the action was performed' })
  before?: string;

  @Field(() => String, { nullable: true, description: 'The state of the entity after the action was performed' })
  after?: string;

  @Field(() => Date, { description: 'The timestamp when the audit log entry was created' })
  createdAt: Date;
}
