import { 
    Controller, Get, Post, Body, Patch, Param, Delete, Version, ParseIntPipe 
  } from '@nestjs/common';
  import { PermissionService } from './permission.service';
  import { CreatePermissionDto } from './dto/create-permission.dto';
  import { UpdatePermissionDto } from './dto/update-permission.dto';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
  
  @ApiTags('Permissions')  // Group under Permissions for Swagger documentation
  @Controller('permissions')
  export class PermissionController {
    constructor(private readonly permissionService: PermissionService) {}
  
    @Version('1')  // Version 1 of the endpoint
    @ApiOperation({ summary: 'Create a new permission (v1)' })
    @ApiResponse({ status: 201, description: 'Permission created successfully.' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @Post()
    async create(@Body() createPermissionDto: CreatePermissionDto) {
      return this.permissionService.create(createPermissionDto);
    }
  
    @Version('1')
    @ApiOperation({ summary: 'Retrieve all permissions (v1)' })
    @ApiResponse({ status: 200, description: 'All permissions retrieved.' })
    @Get()
    async findAll() {
      return this.permissionService.findAll();
    }
  
    @Version('1')
    @ApiOperation({ summary: 'Retrieve a specific permission by ID (v1)' })
    @ApiParam({ name: 'id', description: 'Permission ID', type: 'integer' })
    @ApiResponse({ status: 200, description: 'Permission retrieved.' })
    @ApiResponse({ status: 404, description: 'Permission not found.' })
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
      return this.permissionService.findOne(id);
    }
  
    @Version('1')
    @ApiOperation({ summary: 'Update a specific permission by ID (v1)' })
    @ApiParam({ name: 'id', description: 'Permission ID', type: 'integer' })
    @ApiResponse({ status: 200, description: 'Permission updated successfully.' })
    @ApiResponse({ status: 404, description: 'Permission not found.' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @Patch(':id')
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updatePermissionDto: UpdatePermissionDto,
    ) {
      return this.permissionService.update(id, updatePermissionDto);
    }
  
    @Version('1')
    @ApiOperation({ summary: 'Delete a specific permission by ID (v1)' })
    @ApiParam({ name: 'id', description: 'Permission ID', type: 'integer' })
    @ApiResponse({ status: 200, description: 'Permission deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Permission not found.' })
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
      return this.permissionService.remove(id);
    }
  }
  