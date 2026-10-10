import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  BookStatus,
  Grade,
  Prisma,
  ReadingMode,
} from '../../../generated/prisma/client';
import { TtsService } from '../tts/tts.service';
import { getOwnedChild } from '../../common/get-owned-child';
import { PrismaService } from '../../prisma/prisma.service';
import { BookQueryDto } from './dto/book-query.dto';
import { SubmitBookQuizDto } from './dto/submit-book-quiz.dto';
import { UpdateBookProgressDto } from './dto/update-book-progress.dto';

const gradeValues: Record<string, Grade> = {
  'Grade 1': Grade.GRADE_1,
  'Grade 2': Grade.GRADE_2,
  'Grade 3': Grade.GRADE_3,
  'Grade 4': Grade.GRADE_4,
  'Grade 5': Grade.GRADE_5,
  'Grade 6': Grade.GRADE_6,
  GRADE_1: Grade.GRADE_1,
  GRADE_2: Grade.GRADE_2,
  GRADE_3: Grade.GRADE_3,
  GRADE_4: Grade.GRADE_4,
  GRADE_5: Grade.GRADE_5,
  GRADE_6: Grade.GRADE_6,
};

@Injectable()
export class BooksService {
  private readonly booksRoot = process.env.BOOK_UPLOADS_DIR ?? 'uploads/books';
  private readonly pendingNarration = new Map<
    string,
    Promise<{ audioUrl: string | null; wordTimings: unknown }>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tts: TtsService,
  ) {}

  async listForChild(parentId: string, childId: string, query: BookQueryDto) {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    const grade = query.grade ? this.parseGrade(query.grade) : child.grade;
    const books = await this.prisma.book.findMany({
      where: {
        grade,
        ...(query.trailStop === undefined
          ? {}
          : { trailStop: query.trailStop }),
        status: this.visibleStatuses(),
      },
      orderBy: [{ trailStop: 'asc' }, { createdAt: 'asc' }],
      include: { readings: { where: { childId } } },
    });

    return books.map((book) => ({
      id: book.id,
      title: book.title,
      summary: book.summary,
      grade: book.grade,
      trailStop: book.trailStop,
      language: book.language,
      coverImageUrl: book.coverImageUrl,
      wordCount: book.wordCount,
      readabilityGrade: book.readabilityGrade,
      preview: book.status === BookStatus.IN_REVIEW,
      reading: book.readings[0] ?? null,
    }));
  }

  async getDetail(parentId: string, childId: string, bookId: string) {
    await getOwnedChild(this.prisma, parentId, childId);
    const book = await this.findVisibleBook(bookId, {
      pages: { orderBy: { pageNumber: 'asc' } },
      characters: true,
      quizQuestions: {
        orderBy: { order: 'asc' },
        select: { id: true, order: true, prompt: true, options: true },
      },
      readings: { where: { childId } },
    });

    return {
      id: book.id,
      title: book.title,
      summary: book.summary,
      grade: book.grade,
      trailStop: book.trailStop,
      language: book.language,
      coverImageUrl: book.coverImageUrl,
      wordCount: book.wordCount,
      readabilityGrade: book.readabilityGrade,
      preview: book.status === BookStatus.IN_REVIEW,
      pages: book.pages,
      characters: book.characters,
      quizQuestions: book.quizQuestions.map(
        (question: {
          id: string;
          order: number;
          prompt: string;
          options: Prisma.JsonValue;
        }) => ({
          id: question.id,
          order: question.order,
          prompt: question.prompt,
          options: question.options,
        }),
      ),
      reading: book.readings[0] ?? null,
    };
  }

  async updateProgress(
    parentId: string,
    childId: string,
    bookId: string,
    dto: UpdateBookProgressDto,
  ) {
    await getOwnedChild(this.prisma, parentId, childId);
    const book = await this.findVisibleBook(bookId);
    if (
      dto.lastPage > (await this.prisma.bookPage.count({ where: { bookId } }))
    ) {
      throw new BadRequestException('lastPage is beyond the end of the book');
    }

    return this.prisma.bookReading.upsert({
      where: { childId_bookId: { childId, bookId } },
      create: {
        childId,
        bookId: book.id,
        mode: dto.mode,
        lastPage: dto.lastPage,
        completedAt: dto.completed ? new Date() : null,
      },
      update: {
        mode: dto.mode,
        lastPage: dto.lastPage,
        ...(dto.completed === undefined
          ? {}
          : { completedAt: dto.completed ? new Date() : null }),
      },
    });
  }

  async submitQuiz(
    parentId: string,
    childId: string,
    bookId: string,
    dto: SubmitBookQuizDto,
  ) {
    await getOwnedChild(this.prisma, parentId, childId);
    const book = await this.findVisibleBook(bookId, {
      quizQuestions: { orderBy: { order: 'asc' } },
      pages: { select: { pageNumber: true } },
    });
    const questionIds = new Set(
      book.quizQuestions.map((question) => question.id),
    );
    if (
      dto.answers.length !== questionIds.size ||
      new Set(dto.answers.map((answer) => answer.questionId)).size !==
        dto.answers.length ||
      dto.answers.some((answer) => !questionIds.has(answer.questionId))
    ) {
      throw new BadRequestException(
        'Answers must contain each book quiz question exactly once',
      );
    }

    const answersByQuestion = new Map(
      dto.answers.map((answer) => [answer.questionId, answer]),
    );
    const results = book.quizQuestions.map((question) => {
      const answer = answersByQuestion.get(question.id)!;
      return {
        questionId: question.id,
        selectedAnswer: answer.selectedAnswer,
        correct: answer.selectedAnswer === question.correctAnswer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    });
    const score = results.filter((result) => result.correct).length;

    await this.prisma.$transaction(async (tx) => {
      await tx.bookQuizAttempt.createMany({
        data: results.map((result) => ({
          childId,
          bookQuizQuestionId: result.questionId,
          selectedAnswer: result.selectedAnswer,
          correct: result.correct,
        })),
      });
      await tx.bookReading.upsert({
        where: { childId_bookId: { childId, bookId } },
        create: {
          childId,
          bookId,
          mode: ReadingMode.READ,
          lastPage: Math.max(...book.pages.map((page) => page.pageNumber), 1),
          completedAt: new Date(),
          quizScore: score,
        },
        update: { quizScore: score, completedAt: new Date() },
      });
    });

    return { score, total: results.length, results };
  }

  async getNarration(bookId: string, pageNumber: number) {
    // Visibility check only; the id comes back from the page row itself.
    await this.findVisibleBook(bookId);
    const page = await this.prisma.bookPage.findFirst({
      where: { bookId, pageNumber },
    });
    if (!page) throw new NotFoundException('Book page not found');
    if (page.audioUrl !== null) {
      return { audioUrl: page.audioUrl, wordTimings: page.wordTimings ?? null };
    }

    // Same first-writer-wins pattern as question audio: concurrent first
    // listens share one in-flight synthesis, and the conditional update
    // guarantees only one writer persists its file.
    const pending = this.pendingNarration.get(page.id);
    if (pending) return pending;

    const generation = this.generateNarration(
      bookId,
      page.id,
      page.pageNumber,
      page.text,
    );
    this.pendingNarration.set(page.id, generation);
    try {
      return await generation;
    } finally {
      if (this.pendingNarration.get(page.id) === generation) {
        this.pendingNarration.delete(page.id);
      }
    }
  }

  private async generateNarration(
    bookId: string,
    pageId: string,
    pageNumber: number,
    text: string,
  ): Promise<{ audioUrl: string | null; wordTimings: unknown }> {
    // Another request may have completed while this one was queued.
    const current = await this.prisma.bookPage.findFirst({
      where: { id: pageId },
      select: { audioUrl: true, wordTimings: true },
    });
    if (current?.audioUrl) {
      return {
        audioUrl: current.audioUrl,
        wordTimings: current.wordTimings ?? null,
      };
    }

    const narration = await this.tts.synthesizeWithWordTimings({
      text,
      voiceName: 'en-US-Wavenet-H',
      pitch: 7.0,
      speakingRate: 0.95,
    });
    if (!narration || narration.audio.length === 0) {
      return { audioUrl: null, wordTimings: null };
    }

    const directory = join(this.booksRoot, bookId);
    const filename = `page-${pageNumber}.mp3`;
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), narration.audio);
    const audioUrl = `/book-media/${bookId}/${filename}`;
    const update = await this.prisma.bookPage.updateMany({
      where: { id: pageId, audioUrl: null },
      data: {
        audioUrl,
        wordTimings: narration.wordTimings
          ? (narration.wordTimings as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    if (update.count > 0)
      return { audioUrl, wordTimings: narration.wordTimings };

    const saved = await this.prisma.bookPage.findFirst({
      where: { id: pageId },
      select: { audioUrl: true, wordTimings: true },
    });
    return {
      audioUrl: saved?.audioUrl ?? audioUrl,
      wordTimings: saved?.wordTimings ?? null,
    };
  }

  private visibleStatuses(): Prisma.BookWhereInput['status'] {
    return process.env.BOOKS_ALLOW_PREVIEW === 'true'
      ? { in: [BookStatus.PUBLISHED, BookStatus.IN_REVIEW] }
      : BookStatus.PUBLISHED;
  }

  private async findVisibleBook<T extends Prisma.BookInclude>(
    bookId: string,
    include?: T,
  ): Promise<Prisma.BookGetPayload<{ include: T }>> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, status: this.visibleStatuses() },
      include,
    });
    if (!book) throw new NotFoundException('Book not found');
    return book as Prisma.BookGetPayload<{ include: T }>;
  }

  private parseGrade(value: string): Grade {
    const grade = gradeValues[value];
    if (!grade) throw new BadRequestException('Invalid grade');
    return grade;
  }
}
