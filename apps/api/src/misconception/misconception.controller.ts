import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MisconceptionService } from './misconception.service';

@Controller('children/:childId/misconceptions')
@UseGuards(JwtAuthGuard)
export class MisconceptionController {
  constructor(private readonly misconceptionService: MisconceptionService) {}

  @Get()
  getMisconceptions(@Req() req: Request, @Param('childId') childId: string) {
    return this.misconceptionService.getMisconceptions(
      (req.user as { id: string }).id,
      childId,
    );
  }
}
