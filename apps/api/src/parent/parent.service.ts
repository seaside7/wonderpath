import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParentProfileDto } from './dto/parent-profile.dto';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string): Promise<ParentProfileDto> {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!parent) {
      throw new UnauthorizedException();
    }

    return parent;
  }
}
