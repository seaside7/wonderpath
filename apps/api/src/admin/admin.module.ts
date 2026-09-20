import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

// Admin tokens use their own secret so the parent and admin trust
// boundaries don't share a signing key. Falls back to JWT_SECRET only
// for backwards compatibility with existing deployments.
const jwtSecret = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'ADMIN_JWT_SECRET (or JWT_SECRET) environment variable is required',
  );
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}d`,
      },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy, AdminAuthGuard],
  exports: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
