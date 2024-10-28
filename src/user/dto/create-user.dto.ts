import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'The phone number of the user',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'URL of the user’s profile image',
    example: 'https://example.com/images/profile.jpg',
    required: false,
  })
  profileImageUrl?: string;

  @ApiProperty({
    description: 'The password for the user',
    example: 'StrongPassword123!',
  })
  password: string;
}
