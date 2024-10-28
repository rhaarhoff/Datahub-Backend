import { Controller, Post, Body, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

// Define the DTOs for Swagger documentation
class LoginDto {
  email: string;
  password: string;
}

class LoginResponseDto {
  userId: number;
  email: string;
  name: string;
  tenantId: number | null;
  access_token: string;
}

@ApiTags('Authentication') // Grouping routes in the Swagger UI under "Authentication"
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate a user and return JWT token',
    description: 'This endpoint allows a user to authenticate using their email and password. It returns a JWT token along with basic user information upon successful authentication.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials. Provide email and password to authenticate.',
    examples: {
      valid: {
        summary: 'Valid login credentials',
        description: 'A successful login request with valid credentials.',
        value: {
          email: 'john.doe@example.com',
          password: 'YourSecretPassword',
        },
      },
      invalid: {
        summary: 'Invalid login credentials',
        description: 'An invalid login request with incorrect credentials.',
        value: {
          email: 'john.doe@example.com',
          password: 'WrongPassword',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully authenticated and JWT returned',
    type: LoginResponseDto,
    schema: {
      example: {
        userId: 1,
        email: 'john.doe@example.com',
        name: 'John Doe',
        tenantId: 1,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials provided',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - The user does not have access to this resource',
    schema: {
      example: {
        statusCode: 403,
        message: 'Access denied. You do not have the necessary permissions.',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Something went wrong on the server',
    schema: {
      example: {
        statusCode: 500,
        message: 'An internal server error occurred. Please try again later.',
        error: 'Internal Server Error',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const token = await this.authService.generateJwt(user);
      const tenantId = user.tenants?.length > 0 ? user.tenants[0].tenant.id : null;

      return {
        userId: user.userId,
        email: user.email,
        name: user.name,
        tenantId, // Return tenantId if available
        access_token: token.access_token, // Return the JWT token
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid credentials');
      } else if (error instanceof ForbiddenException) {
        throw new ForbiddenException('Access denied. You do not have the necessary permissions.');
      } else {
        throw new InternalServerErrorException('An internal server error occurred');
      }
    }
  }

  // Example for an authenticated endpoint
  @Post('protected')
  @ApiBearerAuth()  // Swagger will now show that this route requires a JWT token
  @ApiOperation({ summary: 'Protected route that requires JWT authentication' })
  @ApiResponse({
    status: 200,
    description: 'Successfully accessed protected route',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token is missing or invalid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async protectedRoute() {
    return { message: 'You have successfully accessed a protected route!' };
  }
}
