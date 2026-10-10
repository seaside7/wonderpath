import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BookQueryDto } from './dto/book-query.dto';
import { SubmitBookQuizDto } from './dto/submit-book-quiz.dto';
import { UpdateBookProgressDto } from './dto/update-book-progress.dto';
import { BooksService } from './books.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller()
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('children/:childId/books')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('childId') childId: string,
    @Query() query: BookQueryDto,
  ) {
    return this.booksService.listForChild(req.user.id, childId, query);
  }

  @Get('children/:childId/books/:bookId')
  detail(
    @Req() req: AuthenticatedRequest,
    @Param('childId') childId: string,
    @Param('bookId') bookId: string,
  ) {
    return this.booksService.getDetail(req.user.id, childId, bookId);
  }

  @Put('children/:childId/books/:bookId/progress')
  updateProgress(
    @Req() req: AuthenticatedRequest,
    @Param('childId') childId: string,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateBookProgressDto,
  ) {
    return this.booksService.updateProgress(req.user.id, childId, bookId, dto);
  }

  @Post('children/:childId/books/:bookId/quiz')
  submitQuiz(
    @Req() req: AuthenticatedRequest,
    @Param('childId') childId: string,
    @Param('bookId') bookId: string,
    @Body() dto: SubmitBookQuizDto,
  ) {
    return this.booksService.submitQuiz(req.user.id, childId, bookId, dto);
  }

  @Get('books/:bookId/pages/:pageNumber/narration')
  narration(
    @Param('bookId') bookId: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
  ) {
    return this.booksService.getNarration(bookId, pageNumber);
  }
}
