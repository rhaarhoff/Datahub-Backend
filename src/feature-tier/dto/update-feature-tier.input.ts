// src/feature-tier/dto/update-feature-tier.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateFeatureTierInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Name must be at least 3 character long' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name: string;

  @Field({ nullable: false })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string;
}
