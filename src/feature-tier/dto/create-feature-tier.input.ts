// src/feature-tier/dto/create-feature-tier.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateFeatureTierInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description: string;
}

