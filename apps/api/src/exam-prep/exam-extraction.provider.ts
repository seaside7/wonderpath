export interface ExamMaterialInput {
  mimeType: string;
  fileSize: number;
  fileName: string;
  content: Buffer;
}

export interface ExtractedExamTopic {
  label: string;
  confidence: number;
}

export interface ExamExtractionResult {
  extractedText: string;
  topics: ExtractedExamTopic[];
}

export abstract class ExamExtractionProvider {
  abstract extract(input: ExamMaterialInput): Promise<ExamExtractionResult>;
}

export const EXAM_EXTRACTION_PROVIDER = 'EXAM_EXTRACTION_PROVIDER';
