import { IsInt, IsBoolean, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TenantFeatureResponseDto {
  @ApiProperty({ description: 'The unique identifier of the tenant feature', example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'The unique identifier of the tenant', example: 101 })
  @IsInt()
  tenantId: number;

  @ApiProperty({ description: 'The unique identifier of the feature', example: 5 })
  @IsInt()
  featureId: number;

  @ApiProperty({ description: 'Status of the feature (enabled or disabled)', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Timestamp when the feature was subscribed', example: '2023-12-01T10:30:00Z' })
  @IsDate()
  subscribedAt: Date;
}
