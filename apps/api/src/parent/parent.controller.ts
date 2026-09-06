import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParentProfileDto } from './dto/parent-profile.dto';
import { ParentService } from './parent.service';

@Controller()
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: { user: { id: string } }): Promise<ParentProfileDto> {
    return this.parentService.getProfile(req.user.id);
  }
}
