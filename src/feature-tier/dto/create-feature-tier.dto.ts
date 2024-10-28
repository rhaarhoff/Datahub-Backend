// src/feature-tier/dto/create-feature-tier.dto.ts
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeatureTierDto {
  @ApiProperty({ description: 'Name of the feature tier', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Description of the feature tier', maxLength: 255, required: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  description: string;
}