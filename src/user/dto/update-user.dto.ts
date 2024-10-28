import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from '@user-dto/create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'Optional new email of the user',
    example: 'john.new@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Optional new name of the user',
    example: 'John Newname',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Optional new phone number of the user',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Optional new profile image URL for the user',
    example: 'https://example.com/images/new-profile.jpg',
    required: false,
  })
  profileImageUrl?: string;

  @ApiProperty({
    description: 'Optional new password for the user',
    example: 'NewStrongPassword456!',
    required: false,
  })
  password?: string;
}
