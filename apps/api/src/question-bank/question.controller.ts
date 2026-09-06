import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { SearchQuestionsQueryDto } from './dto/search-questions-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionService } from './question.service';

@Controller('questions')
@UseGuards(AdminAuthGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateQuestionDto): Promise<QuestionResponseDto> {
    return this.questionService.create(dto);
  }

  @Get()
  search(
    @Query() query: SearchQuestionsQueryDto,
  ): Promise<QuestionResponseDto[]> {
    return this.questionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<QuestionResponseDto> {
    return this.questionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.questionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.questionService.remove(id);
  }
}
