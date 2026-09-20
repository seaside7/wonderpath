import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from '../admin.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: 'admin';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly adminService: AdminService) {
    const jwtSecret = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        'ADMIN_JWT_SECRET (or JWT_SECRET) environment variable is required',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.role !== 'admin') {
      return null;
    }

    return this.adminService.validateAdmin(payload.sub);
  }
}
