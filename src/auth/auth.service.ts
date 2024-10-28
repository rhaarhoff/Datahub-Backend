import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger, // Import the Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name); // Create a logger instance

  constructor(private readonly jwtService: JwtService) {}

  // Generate JWT token
  async generateJwt(user: any) {
    const payload = { email: user.email, sub: user.userId };

    this.logger.debug(`Generating JWT for user: ${user.email}`); // Debug log for JWT generation

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  
  // Find user by email
  async findUserByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenants: {
            include: {
              tenant: true, // Include the tenant details
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by email');
    }
  }

  // Validate user by email and password
  async validateUser(email: string, password: string) {
    try {
      this.logger.debug(`Attempting to validate user with email: ${email}`); // Debug log before fetching user

      // Find user by email and include tenants (through UserTenant relation)
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenants: {
            include: {
              tenant: true, // This ensures we get the tenant details
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(`User not found with email: ${email}`); // Log warning if user not found
        throw new NotFoundException('User not found');
      }

      this.logger.debug(`User found with email: ${email}, comparing passwords`); // Debug log when user is found

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        this.logger.warn(`Invalid password for user: ${email}`); // Log warning if password is invalid
        throw new UnauthorizedException('Invalid email or password');
      }

      this.logger.debug(
        `Password valid for user: ${email}, returning user details`,
      ); // Debug log for successful validation

      // Return the user object with tenants
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        tenants: user.tenants, // Pass the tenants relation, which includes tenant.id
      };
    } catch (error) {
      this.logger.error(
        `Error validating user with email: ${email}`,
        error.stack,
      ); // Log error if anything goes wrong
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      } else {
        throw new InternalServerErrorException('An unexpected error occurred');
      }
    }
  }
}
