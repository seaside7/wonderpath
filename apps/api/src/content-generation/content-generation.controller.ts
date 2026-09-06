import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ContentGenerationService } from './content-generation.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { GenerationResponseDto } from './dto/generation-response.dto';
import { RetryGenerationDto } from './dto/retry-generation.dto';

@Controller('generations')
@UseGuards(AdminAuthGuard)
export class ContentGenerationController {
  constructor(
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateGenerationDto): Promise<GenerationResponseDto> {
    return this.contentGenerationService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<GenerationResponseDto> {
    return this.contentGenerationService.findOne(id);
  }

  @Post(':id/retry')
  retry(
    @Param('id') id: string,
    @Body() dto: RetryGenerationDto,
  ): Promise<GenerationResponseDto> {
    return this.contentGenerationService.retry(id, dto);
  }
}
