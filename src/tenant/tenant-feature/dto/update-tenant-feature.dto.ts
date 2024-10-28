import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantFeatureDto {
  @ApiProperty({ description: 'Tenant ID', example: 101 })
  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @ApiProperty({ description: 'Feature ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  featureId: number;

  @ApiProperty({ description: 'Enabled flag', example: true, required: false })
  enabled?: boolean;
  
  @ApiProperty({ description: 'New plan ID for update', example: 1 })
  @IsInt()
  @IsNotEmpty()
  newPlanId: number;
}
