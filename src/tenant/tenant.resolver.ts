import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { TenantService } from './tenant.service';
import { Tenant } from './models/tenant.model';

@Resolver(() => Tenant)
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @Query(() => [Tenant])
  async tenants() {
    return this.tenantService.findAll();
  }

  @Query(() => Tenant)
  async tenant(@Args('id', { type: () => Int }) id: number) {
    return this.tenantService.findOne(id);
  }

  @Mutation(() => Tenant)
  async createTenant(@Args('createTenantInput') createTenantInput: any) {
    return this.tenantService.create(createTenantInput);
  }

  @Mutation(() => Tenant)
  async updateTenant(@Args('id', { type: () => Int }) id: number, @Args('updateTenantInput') updateTenantInput: any) {
    return this.tenantService.update(id, updateTenantInput);
  }

  @Mutation(() => Tenant)
  async removeTenant(@Args('id', { type: () => Int }) id: number) {
    return this.tenantService.remove(id);
  }
}
