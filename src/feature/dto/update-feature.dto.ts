import { PartialType } from '@nestjs/mapped-types';
import { CreateFeatureDto } from './create-feature.dto';
import { IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {
  @ApiProperty({
    description: 'The unique identifier of the feature',
    example: 1,
  })
  @IsInt()
  id: number;

  @ApiProperty({
    description: 'Whether the feature is enabled or not',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'A brief description of the feature',
    example: 'Updated description for feature',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The tier id for the feature',
    example: 2,
  })
  @IsInt()
  @IsOptional()
  tierId?: number;
}
