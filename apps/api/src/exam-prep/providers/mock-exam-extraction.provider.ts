import { Injectable } from '@nestjs/common';
import { MOCK_EXTRACTOR_DEFAULT_TOPICS } from '../exam-prep.config';
import {
  ExamExtractionProvider,
  ExamExtractionResult,
  ExamMaterialInput,
} from '../exam-extraction.provider';

@Injectable()
export class MockExamExtractionProvider extends ExamExtractionProvider {
  extract(input: ExamMaterialInput): Promise<ExamExtractionResult> {
    if (input.fileName.includes('corrupt')) {
      return Promise.reject(
        new Error('Extraction failed: unreadable file content'),
      );
    }

    return Promise.resolve({
      extractedText: `Extracted by mock provider from ${input.fileName} (${input.mimeType}, ${input.fileSize} bytes)`,
      topics: [...MOCK_EXTRACTOR_DEFAULT_TOPICS],
    });
  }
}
