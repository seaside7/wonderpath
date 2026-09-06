import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MasteryResponseDto } from './dto/mastery-response.dto';
import { StudentModelService } from './student-model.service';

@Controller('children')
@UseGuards(JwtAuthGuard)
export class MasteryController {
  constructor(private readonly studentModelService: StudentModelService) {}

  @Get(':childId/mastery')
  getMastery(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
  ): Promise<MasteryResponseDto> {
    return this.studentModelService.getMastery(req.user.id, childId);
  }
}
