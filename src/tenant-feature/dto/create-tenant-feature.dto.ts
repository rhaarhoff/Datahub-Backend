import { IsInt, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RoleDetailsDto {
  @ApiProperty({ description: 'Name of the role', example: 'Admin' })
  @IsNotEmpty()
  name: string;
}

export class UserRoleDto {
  @ApiProperty({ description: 'The unique identifier of the user role', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;

  @ApiProperty({ description: 'The unique identifier of the role', example: 2 })
  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @ApiProperty({ description: 'Details of the role' })
  @ValidateNested()
  @Type(() => RoleDetailsDto)
  role: RoleDetailsDto;
}

export class FeatureDetailsDto {
  @ApiProperty({ description: 'Name of the feature', example: 'Manage Users' })
  @IsNotEmpty()
  name: string;
}

export class TenantFeatureDto {
  @ApiProperty({ description: 'The unique identifier of the feature', example: 3 })
  @IsInt()
  @IsNotEmpty()
  featureId: number;

  @ApiProperty({ description: 'Details of the feature' })
  @ValidateNested()
  @Type(() => FeatureDetailsDto)
  feature: FeatureDetailsDto;
}
