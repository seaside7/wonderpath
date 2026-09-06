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
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChildService } from './child.service';
import { ChildResponseDto } from './dto/child-response.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Controller('children')
@UseGuards(JwtAuthGuard)
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateChildDto,
  ): Promise<ChildResponseDto> {
    return this.childService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: { user: { id: string } }): Promise<ChildResponseDto[]> {
    return this.childService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<ChildResponseDto> {
    return this.childService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ): Promise<ChildResponseDto> {
    return this.childService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<void> {
    await this.childService.remove(req.user.id, id);
  }
}
