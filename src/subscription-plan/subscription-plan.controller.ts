import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, Query } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { SubscriptionPlanWithOptionalRelationsDto } from './dto/subscription-plan-with-optional-relations.dto';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({
    status: 201,
    description: 'The subscription plan has been successfully created.',
    type: SubscriptionPlanWithOptionalRelationsDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data for subscription plan.' })
  @HttpCode(201)
  async create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanWithOptionalRelationsDto> {
    return this.subscriptionPlanService.create(createSubscriptionPlanDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create subscription plans' })
  @ApiResponse({
    status: 201,
    description: 'The subscription plans have been successfully created in bulk.',
    type: [SubscriptionPlanWithOptionalRelationsDto],
  })
  @ApiBadRequestResponse({ description: 'Invalid input data for bulk subscription plan creation.' })
  @HttpCode(201)
  async bulkCreate(
    @Body() createSubscriptionPlans: CreateSubscriptionPlanDto[],
  ): Promise<SubscriptionPlanWithOptionalRelationsDto[]> {
    return this.subscriptionPlanService.bulkCreate(createSubscriptionPlans);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all active subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'List of all active subscription plans.',
    type: [SubscriptionPlanWithOptionalRelationsDto],
  })
  @HttpCode(200)
  async findAll(): Promise<SubscriptionPlanWithOptionalRelationsDto[]> {
    return this.subscriptionPlanService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a subscription plan by ID' })
  @ApiResponse({
    status: 200,
    description: 'The subscription plan has been successfully retrieved.',
    type: SubscriptionPlanWithOptionalRelationsDto,
  })
  @ApiNotFoundResponse({ description: 'Subscription plan not found.' })
  @ApiBadRequestResponse({ description: 'Invalid subscription plan ID.' })
  @HttpCode(200)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeNested') includeNested?: string,
  ): Promise<SubscriptionPlanWithOptionalRelationsDto> {
    const includeRelations = includeNested === 'true';
    return this.subscriptionPlanService.findOne(id, includeRelations);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan by ID' })
  @ApiResponse({
    status: 200,
    description: 'The subscription plan has been successfully updated.',
    type: SubscriptionPlanWithOptionalRelationsDto,
  })
  @ApiNotFoundResponse({ description: 'Subscription plan not found.' })
  @ApiBadRequestResponse({ description: 'Invalid subscription plan ID or input data.' })
  @HttpCode(200)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlanWithOptionalRelationsDto> {
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete (recycle) a subscription plan by ID' })
  @ApiResponse({
    status: 204,
    description: 'The subscription plan has been successfully soft-deleted.',
  })
  @ApiNotFoundResponse({ description: 'Subscription plan not found.' })
  @ApiBadRequestResponse({ description: 'Invalid subscription plan ID.' })
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.subscriptionPlanService.remove(id);
  }

  @Get('recycle-bin')
  @ApiOperation({ summary: 'Retrieve all soft-deleted subscription plans (recycle bin)' })
  @ApiResponse({
    status: 200,
    description: 'List of all soft-deleted subscription plans.',
    type: [SubscriptionPlanWithOptionalRelationsDto],
  })
  @HttpCode(200)
  async findAllDeleted(): Promise<SubscriptionPlanWithOptionalRelationsDto[]> {
    return this.subscriptionPlanService.findAllDeleted();
  }

  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted subscription plan from the recycle bin' })
  @ApiResponse({
    status: 200,
    description: 'The subscription plan has been successfully restored.',
    type: SubscriptionPlanWithOptionalRelationsDto,
  })
  @ApiNotFoundResponse({ description: 'Subscription plan not found or not in the recycle bin.' })
  @HttpCode(200)
  async restore(@Param('id', ParseIntPipe) id: number): Promise<SubscriptionPlanWithOptionalRelationsDto> {
    return this.subscriptionPlanService.restore(id);
  }

  @Delete('hard-remove/:id')
  @ApiOperation({ summary: 'Permanently delete a subscription plan by ID' })
  @ApiResponse({
    status: 204,
    description: 'The subscription plan has been permanently deleted.',
  })
  @ApiNotFoundResponse({ description: 'Subscription plan not found.' })
  @ApiBadRequestResponse({ description: 'Invalid subscription plan ID or assigned to active tenants.' })
  @HttpCode(204)
  async hardRemove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.subscriptionPlanService.hardRemove(id);
  }
}
