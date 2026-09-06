import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const parent = await this.prisma.parent.create({
        data: {
          email: dto.email,
          password: passwordHash,
        },
      });

      return { accessToken: this.signToken(parent.id, parent.email) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const parent = await this.prisma.parent.findUnique({
      where: { email: dto.email },
    });

    if (!parent) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(parent.password, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { accessToken: this.signToken(parent.id, parent.email) };
  }

  async validateParent(parentId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new UnauthorizedException();
    }

    return parent;
  }

  private signToken(sub: string, email: string): string {
    return this.jwtService.sign({ sub, email });
  }
}
