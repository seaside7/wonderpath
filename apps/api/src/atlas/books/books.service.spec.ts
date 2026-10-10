import { NotFoundException } from '@nestjs/common';
import {
  BookStatus,
  Grade,
  PreferredLanguage,
} from '../../../generated/prisma/client';
import { BooksService } from './books.service';

describe('BooksService', () => {
  const child = { id: 'child-1', grade: Grade.GRADE_5 };
  const baseBook = {
    id: 'book-1',
    title: 'A Quiet River',
    summary: 'A science adventure.',
    grade: Grade.GRADE_5,
    trailStop: 1,
    language: PreferredLanguage.ENGLISH,
    coverImageUrl: null,
    status: BookStatus.PUBLISHED,
    wordCount: 700,
    readabilityGrade: 5,
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        text: 'A river moved.',
        imageUrl: null,
        audioUrl: null,
        wordTimings: null,
      },
    ],
    characters: [],
    quizQuestions: [
      {
        id: 'q-1',
        order: 1,
        prompt: 'Where?',
        options: ['River', 'Mountain'],
        correctAnswer: 'River',
        explanation: 'The story says river.',
      },
    ],
    readings: [],
  };

  function createService() {
    const prisma = {
      child: { findFirst: jest.fn().mockResolvedValue(child) },
      book: { findFirst: jest.fn().mockResolvedValue(baseBook) },
      bookPage: {
        findFirst: jest.fn().mockResolvedValue(baseBook.pages[0]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;
    const tts = {
      synthesizeWithWordTimings: jest.fn().mockResolvedValue(null),
    } as any;
    return { service: new BooksService(prisma, tts), prisma, tts };
  }

  afterEach(() => {
    delete process.env.BOOKS_ALLOW_PREVIEW;
    baseBook.status = BookStatus.PUBLISHED;
    baseBook.pages[0].audioUrl = null;
  });

  it('does not expose quiz answers in book detail', async () => {
    const { service } = createService();
    const detail = await service.getDetail('parent-1', child.id, baseBook.id);
    expect(detail.quizQuestions[0]).toEqual({
      id: 'q-1',
      order: 1,
      prompt: 'Where?',
      options: ['River', 'Mountain'],
    });
    expect(detail.quizQuestions[0]).not.toHaveProperty('correctAnswer');
    expect(detail.quizQuestions[0]).not.toHaveProperty('explanation');
  });

  it('returns null narration in TTS mock mode', async () => {
    const { service, tts } = createService();
    await expect(service.getNarration(baseBook.id, 1)).resolves.toEqual({
      audioUrl: null,
      wordTimings: null,
    });
    expect(tts.synthesizeWithWordTimings).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceName: 'en-US-Wavenet-H',
        pitch: 7,
        speakingRate: 0.95,
      }),
    );
  });

  it('hides in-review books unless preview is enabled', async () => {
    const { service, prisma } = createService();
    baseBook.status = BookStatus.IN_REVIEW;
    prisma.book.findFirst.mockResolvedValue(null);
    await expect(service.getNarration(baseBook.id, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    process.env.BOOKS_ALLOW_PREVIEW = 'true';
    prisma.book.findFirst.mockResolvedValue(baseBook);
    await expect(
      service.getDetail('parent-1', child.id, baseBook.id),
    ).resolves.toMatchObject({ preview: true });
  });

  it('reuses saved narration without calling TTS again', async () => {
    const { service, tts } = createService();
    baseBook.pages[0].audioUrl = '/book-media/book-1/page-1.mp3';
    await expect(service.getNarration(baseBook.id, 1)).resolves.toEqual({
      audioUrl: '/book-media/book-1/page-1.mp3',
      wordTimings: null,
    });
    expect(tts.synthesizeWithWordTimings).not.toHaveBeenCalled();
  });

  it("returns 404 for another parent's child", async () => {
    const { service, prisma } = createService();
    prisma.child.findFirst.mockResolvedValue(null);
    await expect(
      service.getDetail('other-parent', child.id, baseBook.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
