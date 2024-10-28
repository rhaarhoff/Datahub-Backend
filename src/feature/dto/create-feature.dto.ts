import { IsString, IsBoolean, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({
    description: 'The name of the feature',
    example: 'Feature A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A brief description of the feature',
    example: 'This feature allows ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The ID of the feature tier',
    example: 1,
  })
  @IsInt() // The tier will be referenced by its ID
  tierId: number;

  @ApiProperty({
    description: 'Indicates if the feature is a premium feature',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;

  @ApiProperty({
    description: 'Whether the feature is enabled or not',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
