import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthResponseDto } from './dto/admin-auth-response.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(admin.password, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: this.jwtService.sign({
        sub: admin.id,
        email: admin.email,
        role: 'admin',
      }),
    };
  }

  async validateAdmin(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException();
    }

    return { id: admin.id, email: admin.email, role: 'admin' as const };
  }
}
