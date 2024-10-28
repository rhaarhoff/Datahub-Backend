import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: { email: string }) {
    // Validate user based on email from JWT payload
    const user = await this.authService.findUserByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Return user information (tenant will be set later)
    return { userId: user.id, email: user.email };
  }
}
