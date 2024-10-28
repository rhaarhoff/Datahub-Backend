import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Enforcer, newEnforcer } from 'casbin';
import { PrismaService } from '@prisma-service/prisma.service';
import { PrismaAdapterService } from './prisma-adapter.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/interfaces/audit-action.enum';

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer;
  private isInitialized = false;
  private readonly logger = new Logger(CasbinService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaAdapterService: PrismaAdapterService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // Initialize the Casbin enforcer
  async onModuleInit() {
    if (!this.isInitialized) {
      try {
        this.enforcer = await newEnforcer(
          './model.conf',
          this.prismaAdapterService,
        );
        await this.enforcer.loadPolicy();
        this.isInitialized = true;
        this.logger.log('Casbin enforcer initialized');
      } catch (error) {
        this.logger.error('Error initializing Casbin enforcer', error.stack);
        throw new Error('Failed to initialize Casbin enforcer');
      }
    }
  }

  // Ensure the enforcer is initialized
  private async ensureEnforcerInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.onModuleInit();
    }
  }

  // Enforce a policy
  async enforce(...args: string[]): Promise<boolean> {
    await this.ensureEnforcerInitialized();
    return this.enforcer.enforce(...args);
  }

  // Check if a user has a specific role (RBAC)
  async hasGroupingPolicy(user: string, role: string, tenant: string): Promise<boolean> {
    await this.ensureEnforcerInitialized();
    return this.enforcer.hasGroupingPolicy(user, role, tenant);
  }

  // Check if a user has a specific permission (ABAC)
  async getRolesForUser(user: string): Promise<string[]> {
    await this.ensureEnforcerInitialized();
    return this.enforcer.getRolesForUser(user);
  }

  // Add a new policy and log the action
  async addPolicy(
    userId: number,
    sub: string,
    obj: string,
    act: string,
    ...attrs: string[]
  ): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      const added = await this.enforcer.addPolicy(sub, obj, act, ...attrs);
      if (added) {
        // Persist the policy in the database
        await this.prismaService.$transaction(async () => {
          await this.prismaAdapterService.addPolicy('p', sub, [
            sub,
            obj,
            act,
            ...attrs,
          ]);
        });

        // Invalidate cache after adding the policy
        const cacheKey = this.cacheService.generateCacheKey(
          'casbin',
          'policies',
        );
        await this.cacheService.clear(cacheKey);

        // Log the action using the provided userId
        await this.auditService.logAction({
          action: AuditAction.CREATE_POLICY,
          userId,
          before: null,
          after: { sub, obj, act, attrs },
        });
      } else {
        throw new Error(`Policy already exists for [${sub}, ${obj}, ${act}]`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to add policy: [${sub}, ${obj}, ${act}, ${attrs.join(', ')}]`,
        error.stack,
      );
      throw new BadRequestException('Failed to add policy to Casbin');
    }
  }

  // Remove an existing policy and log the action
  async removePolicy(
    userId: number,
    sub: string,
    obj: string,
    act: string,
    ...attrs: string[]
  ): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      const removed = await this.enforcer.removePolicy(sub, obj, act, ...attrs);
      if (removed) {
        await this.prismaAdapterService.removePolicy('p', sub, [
          sub,
          obj,
          act,
          ...attrs,
        ]);

        const cacheKey = this.cacheService.generateCacheKey(
          'casbin',
          'policies',
        );
        await this.cacheService.clear(cacheKey);

        // Log the action
        await this.auditService.logAction({
          action: AuditAction.DELETE_POLICY,
          userId,
          before: { sub, obj, act, attrs },
          after: null, // No 'after' state since this policy is being deleted
        });
      } else {
        throw new Error(`Policy does not exist for [${sub}, ${obj}, ${act}]`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove policy: [${sub}, ${obj}, ${act}, ${attrs.join(', ')}]`,
        error.stack,
      );
      throw new BadRequestException('Failed to remove policy from Casbin');
    }
  }

  // Add a role to Casbin and log the action
  async addRole(role: string, userId: number): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      const added = await this.enforcer.addGroupingPolicy(role);
      if (added) {
        this.logger.log(`Role added: ${role}`);

        // Log the action
        await this.auditService.logAction({
          action: AuditAction.ADD_ROLE,
          userId,
          before: null, // No 'before' state for adding
          after: { role },
        });
      } else {
        throw new Error('Role could not be added');
      }
    } catch (error) {
      this.logger.error(`Failed to add role: ${role}`, error.stack);
      throw new BadRequestException('Failed to add role to Casbin');
    }
  }

  // Update an existing role and log the action
  async updateRole(
    oldRole: string,
    newRole: string,
    userId: number,
  ): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      const updated = await this.enforcer.updateGroupingPolicy(
        [oldRole],
        [newRole],
      );
      if (updated) {
        this.logger.log(`Role updated from ${oldRole} to ${newRole}`);

        // Log the action
        await this.auditService.logAction({
          action: AuditAction.UPDATE_ROLE,
          userId,
          before: { role: oldRole },
          after: { role: newRole },
        });
      } else {
        throw new Error(`Failed to update role from ${oldRole} to ${newRole}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update role from ${oldRole} to ${newRole}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update role in Casbin');
    }
  }

  // Remove an existing role and log the action
  async removeRole(role: string, userId: number): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      const removed = await this.enforcer.removeGroupingPolicy(role);
      if (removed) {
        this.logger.log(`Role removed: ${role}`);

        // Log the action
        await this.auditService.logAction({
          action: AuditAction.DELETE_ROLE,
          userId,
          before: { role },
          after: null, // No 'after' state since this role is being deleted
        });
      } else {
        throw new Error('Role could not be removed');
      }
    } catch (error) {
      this.logger.error(`Failed to remove role: ${role}`, error.stack);
      throw new BadRequestException('Failed to remove role from Casbin');
    }
  }

  // Enhanced with Caching: Cache all policy lookups
  async getAllPolicies(): Promise<string[][]> {
    await this.ensureEnforcerInitialized();
    const cacheKey = this.cacheService.generateCacheKey('casbin', 'policies');

    return this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        try {
          const policies = await this.enforcer.getPolicy();
          this.logger.log(`Retrieved all policies, count: ${policies.length}`);
          return policies;
        } catch (error) {
          this.logger.error('Failed to retrieve all policies', error.stack);
          throw new BadRequestException(
            'Failed to retrieve policies from Casbin',
          );
        }
      },
      this.cacheService.getTTLForFeature('casbinPolicies'),
    ); // Use TTL from config
  }

  // Enhanced with Caching: Cache policy existence checks
  async policyExists(
    sub: string,
    obj: string,
    act: string,
    ...attrs: string[]
  ): Promise<boolean> {
    await this.ensureEnforcerInitialized();
    const cacheKey = this.cacheService.generateCacheKey(
      'casbin',
      'policyExists',
      sub,
      obj,
      act,
      ...attrs,
    );

    return this.cacheService.getOrFetch(
      cacheKey,
      async () => {
        try {
          return await this.enforcer.hasPolicy(sub, obj, act, ...attrs);
        } catch (error) {
          this.logger.error(
            `Failed to check existence of policy: [${sub}, ${obj}, ${act}, ${attrs.join(', ')}]`,
            error.stack,
          );
          throw new BadRequestException('Failed to check policy existence');
        }
      },
      this.cacheService.getTTLForFeature('casbinPolicies'),
    );
  }

  // Method to save policies to the database, useful for syncing after changes
  public async savePoliciesToDatabase(): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      await this.prismaService.$transaction(async (prisma) => {
        await prisma.casbinRule.deleteMany(); // Clear existing policies
        const allPolicies = await this.enforcer.getPolicy();

        await prisma.casbinRule.createMany({
          data: allPolicies.map((policy) => {
            return {
              ptype: 'p',
              v0: policy[0],
              v1: policy[1],
              v2: policy[2],
              ...(policy[3] && { v3: policy[3] }),
              ...(policy[4] && { v4: policy[4] }),
              ...(policy[5] && { v5: policy[5] }),
              ...(policy[6] && { v6: policy[6] }),
            };
          }),
        });
      });
      this.logger.log('Policies saved successfully to the database');
    } catch (error) {
      this.logger.error('Error saving policies to the database', error.stack);
      throw new BadRequestException('Failed to save policies to the database');
    }
  }

  // Method to load policies from the database
  public async loadPoliciesFromDatabase(): Promise<void> {
    await this.ensureEnforcerInitialized();
    try {
      await this.enforcer.loadPolicy();
      const policyCount = (await this.enforcer.getPolicy()).length;
      this.logger.log(`Loaded ${policyCount} policies from the database`);
    } catch (error) {
      this.logger.error(
        'Failed to load policies from the database',
        error.stack,
      );
      throw new BadRequestException(
        'Failed to load policies from the database',
      );
    }
  }
}
