import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeatureTierDto {
  @ApiProperty({ description: 'Name of the feature tier', maxLength: 50, required: false })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ description: 'Description of the feature tier', maxLength: 255, required: false })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  description?: string;
}
