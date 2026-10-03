import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ParentProfileDto } from './dto/parent-profile.dto';
import { PinVerifyResponseDto } from './dto/pin.dto';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string): Promise<ParentProfileDto> {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: { id: true, email: true, pinHash: true, createdAt: true },
    });

    if (!parent) {
      throw new UnauthorizedException();
    }

    return {
      id: parent.id,
      email: parent.email,
      createdAt: parent.createdAt,
      hasPin: parent.pinHash !== null,
    };
  }

  async setPin(id: string, pin: string): Promise<ParentProfileDto> {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!parent) {
      throw new UnauthorizedException();
    }

    const pinHash = await argon2.hash(pin);

    const updated = await this.prisma.parent.update({
      where: { id },
      data: { pinHash },
      select: { id: true, email: true, pinHash: true, createdAt: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      createdAt: updated.createdAt,
      hasPin: updated.pinHash !== null,
    };
  }

  async verifyPin(id: string, pin: string): Promise<PinVerifyResponseDto> {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: { pinHash: true },
    });

    if (!parent?.pinHash) {
      return { valid: false };
    }

    const valid = await argon2.verify(parent.pinHash, pin);
    return { valid };
  }
}
