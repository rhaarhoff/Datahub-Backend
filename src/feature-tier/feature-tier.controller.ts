// src/feature-tier/feature-tier.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
  import { FeatureTierService } from './feature-tier.service';
  import { CreateFeatureTierDto } from './dto/create-feature-tier.dto';
  import { UpdateFeatureTierDto } from './dto/update-feature-tier.dto';
  
  @ApiTags('Feature Tier')
  @Controller('feature-tier')
  export class FeatureTierController {
    constructor(private readonly featureTierService: FeatureTierService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new feature tier' })
    @ApiBody({ type: CreateFeatureTierDto })
    @ApiResponse({ status: 201, description: 'Feature tier created successfully.' })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    create(@Body() createFeatureTierDto: CreateFeatureTierDto) {
      return this.featureTierService.create(createFeatureTierDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all feature tiers' })
    @ApiResponse({ status: 200, description: 'List of all feature tiers.' })
    findAll() {
      return this.featureTierService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a feature tier by ID' })
    @ApiParam({ name: 'id', type: 'string', description: 'ID of the feature tier' })
    @ApiResponse({ status: 200, description: 'Feature tier found.' })
    @ApiResponse({ status: 404, description: 'Feature tier not found.' })
    findOne(@Param('id') id: string) {
      return this.featureTierService.findOne(+id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a feature tier by ID' })
    @ApiParam({ name: 'id', type: 'string', description: 'ID of the feature tier' })
    @ApiBody({ type: UpdateFeatureTierDto })
    @ApiResponse({ status: 200, description: 'Feature tier updated successfully.' })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    @ApiResponse({ status: 404, description: 'Feature tier not found.' })
    update(
      @Param('id') id: string,
      @Body() updateFeatureTierDto: UpdateFeatureTierDto,
    ) {
      return this.featureTierService.update(+id, updateFeatureTierDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a feature tier by ID' })
    @ApiParam({ name: 'id', type: 'string', description: 'ID of the feature tier' })
    @ApiResponse({ status: 200, description: 'Feature tier deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Feature tier not found.' })
    remove(@Param('id') id: string) {
      return this.featureTierService.remove(+id);
    }
  
    // Fetch soft-deleted feature tiers (recycle bin)
    @Get('deleted')
    @ApiOperation({ summary: 'Get all soft-deleted feature tiers' })
    @ApiResponse({ status: 200, description: 'List of all soft-deleted feature tiers.' })
    findDeleted() {
      return this.featureTierService.findDeleted();
    }
  
    // Restore a soft-deleted feature tier
    @Patch('restore/:id')
    @ApiOperation({ summary: 'Restore a soft-deleted feature tier by ID' })
    @ApiParam({ name: 'id', type: 'string', description: 'ID of the feature tier to restore' })
    @ApiResponse({ status: 200, description: 'Feature tier restored successfully.' })
    @ApiResponse({ status: 404, description: 'Feature tier not found.' })
    restore(@Param('id') id: string) {
      return this.featureTierService.restore(+id);
    }
  }