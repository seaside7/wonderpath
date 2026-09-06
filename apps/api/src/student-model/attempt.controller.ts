import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { AttemptResponseDto } from './dto/attempt-response.dto';
import { StudentModelService } from './student-model.service';

@Controller('attempts')
@UseGuards(JwtAuthGuard)
export class AttemptController {
  constructor(private readonly studentModelService: StudentModelService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateAttemptDto,
  ): Promise<AttemptResponseDto> {
    return this.studentModelService.recordAttempt(req.user.id, dto);
  }
}
