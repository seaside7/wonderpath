export const EXAM_PREP_CONFIG = {
  maxFileBytes: 5 * 1024 * 1024,
  allowedMimeTypes: {
    'application/pdf': 'PDF',
    'image/jpeg': 'PHOTO',
    'image/png': 'PHOTO',
  } as Record<string, 'PDF' | 'PHOTO'>,
  uploadsRoot: process.env.EXAM_UPLOADS_DIR || 'uploads/exam-prep',
} as const;

export const MOCK_EXTRACTOR_DEFAULT_TOPICS = [
  { label: 'Fractions', confidence: 0.92 },
  { label: 'Decimals', confidence: 0.85 },
  { label: 'Geometry', confidence: 0.78 },
] as const;
