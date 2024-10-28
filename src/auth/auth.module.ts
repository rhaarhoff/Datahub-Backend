import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthResolver } from './auth.resolver';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',  // Ensure you have a secret key in your .env file
      signOptions: { expiresIn: '60m' },  // Token expiration time
    }),
  ],
  controllers: [AuthController],  // Make sure to register the controller here
  providers: [AuthService, JwtStrategy, AuthResolver],  // Register the auth service and JWT strategy
  exports: [AuthService],  // Export AuthService so it can be used in other modules if needed
})
export class AuthModule {}
