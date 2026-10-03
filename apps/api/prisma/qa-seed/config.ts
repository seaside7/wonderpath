export interface SubtopicDef {
  topic: string;
  subtopic: string;
  learningObjective: string;
  description: string;
  estimatedMasteryTime: number;
}

export const SUBJECT_STRUCTURE: Record<'Mathematics' | 'English', SubtopicDef[]> = {
  Mathematics: [
    { topic: 'Number Sense', subtopic: 'Place Value', learningObjective: 'Understand and compare place values in multi-digit numbers', description: 'Identify the value of digits in whole numbers and use place value to compare and order numbers.', estimatedMasteryTime: 30 },
    { topic: 'Number Sense', subtopic: 'Rounding & Estimation', learningObjective: 'Round numbers and estimate to solve problems', description: 'Round whole numbers and decimals to a given place, and use estimation to check reasonableness.', estimatedMasteryTime: 25 },
    { topic: 'Number Sense', subtopic: 'Factors & Multiples', learningObjective: 'Find factors and multiples of whole numbers', description: 'Identify factors, multiples, and common factors/multiples of whole numbers.', estimatedMasteryTime: 30 },
    { topic: 'Fractions', subtopic: 'Equivalent Fractions', learningObjective: 'Identify and generate equivalent fractions', description: 'Recognize and create equivalent fractions using multiplication and division.', estimatedMasteryTime: 30 },
    { topic: 'Fractions', subtopic: 'Comparing Fractions', learningObjective: 'Compare and order fractions with different denominators', description: 'Use common denominators or benchmarks to compare and order fractions.', estimatedMasteryTime: 30 },
    { topic: 'Fractions', subtopic: 'Add/Subtract Fractions', learningObjective: 'Add and subtract fractions with like and unlike denominators', description: 'Add and subtract fractions, including finding common denominators.', estimatedMasteryTime: 35 },
    { topic: 'Decimals', subtopic: 'Decimal Place Value', learningObjective: 'Understand place value in decimal numbers', description: 'Identify the value of digits in decimal numbers to the hundredths or thousandths place.', estimatedMasteryTime: 25 },
    { topic: 'Decimals', subtopic: 'Comparing Decimals', learningObjective: 'Compare and order decimal numbers', description: 'Compare and order decimals using place value reasoning.', estimatedMasteryTime: 25 },
    { topic: 'Decimals', subtopic: 'Decimal Operations', learningObjective: 'Add, subtract, multiply, and divide decimals', description: 'Perform the four operations with decimal numbers in context.', estimatedMasteryTime: 35 },
    { topic: 'Percentages', subtopic: 'Percentage of a Number', learningObjective: 'Calculate a percentage of a given quantity', description: 'Find the percentage of a number using multiple strategies.', estimatedMasteryTime: 30 },
    { topic: 'Percentages', subtopic: 'Fraction-Decimal-Percentage Conversion', learningObjective: 'Convert between fractions, decimals, and percentages', description: 'Convert fluently between fraction, decimal, and percentage representations.', estimatedMasteryTime: 30 },
    { topic: 'Measurement', subtopic: 'Units', learningObjective: 'Convert between units of measurement', description: 'Convert between metric units of length, mass, and volume.', estimatedMasteryTime: 25 },
    { topic: 'Measurement', subtopic: 'Perimeter & Area', learningObjective: 'Calculate perimeter and area of 2D shapes', description: 'Find the perimeter and area of rectangles, squares, and composite shapes.', estimatedMasteryTime: 30 },
    { topic: 'Measurement', subtopic: 'Time & Money', learningObjective: 'Solve problems involving time and money', description: 'Solve real-world problems involving elapsed time, schedules, and money calculations.', estimatedMasteryTime: 25 },
    { topic: 'Geometry', subtopic: '2D Shapes', learningObjective: 'Classify and describe properties of 2D shapes', description: 'Identify and classify 2D shapes by their properties (sides, angles, symmetry).', estimatedMasteryTime: 25 },
    { topic: 'Geometry', subtopic: '3D Shapes', learningObjective: 'Classify and describe properties of 3D shapes', description: 'Identify 3D shapes and describe their faces, edges, and vertices.', estimatedMasteryTime: 25 },
    { topic: 'Geometry', subtopic: 'Angles', learningObjective: 'Measure and classify angles', description: 'Identify, measure, and classify angles as acute, right, obtuse, or straight.', estimatedMasteryTime: 25 },
  ],
  English: [
    { topic: 'Vocabulary', subtopic: 'Synonyms & Antonyms', learningObjective: 'Identify synonyms and antonyms in context', description: 'Recognize words with similar and opposite meanings and use them appropriately.', estimatedMasteryTime: 20 },
    { topic: 'Vocabulary', subtopic: 'Context Clues', learningObjective: 'Use context clues to determine word meaning', description: 'Use surrounding text to infer the meaning of unfamiliar words.', estimatedMasteryTime: 25 },
    { topic: 'Grammar', subtopic: 'Parts of Speech', learningObjective: 'Identify parts of speech in sentences', description: 'Recognize nouns, verbs, adjectives, adverbs, and other parts of speech in context.', estimatedMasteryTime: 25 },
    { topic: 'Grammar', subtopic: 'Verb Tenses', learningObjective: 'Use correct verb tenses in writing and speech', description: 'Identify and correctly use past, present, and future verb tenses.', estimatedMasteryTime: 30 },
    { topic: 'Grammar', subtopic: 'Sentence Structure', learningObjective: 'Construct and identify correct sentence structures', description: 'Identify simple, compound, and complex sentences and correct sentence fragments/run-ons.', estimatedMasteryTime: 30 },
    { topic: 'Reading Comprehension', subtopic: 'Main Idea & Details', learningObjective: 'Identify the main idea and supporting details in a passage', description: 'Determine the central idea of a text and the details that support it.', estimatedMasteryTime: 30 },
    { topic: 'Reading Comprehension', subtopic: 'Inference', learningObjective: 'Make inferences based on textual evidence', description: 'Draw logical conclusions from information implied but not directly stated in a text.', estimatedMasteryTime: 30 },
    { topic: 'Reading Comprehension', subtopic: 'Sequencing', learningObjective: 'Identify and order the sequence of events in a text', description: 'Recognize the order of events and understand sequencing language.', estimatedMasteryTime: 25 },
    { topic: 'Writing', subtopic: 'Paragraph Structure', learningObjective: 'Construct well-organized paragraphs', description: 'Write paragraphs with a clear topic sentence, supporting details, and conclusion.', estimatedMasteryTime: 30 },
    { topic: 'Writing', subtopic: 'Descriptive Writing', learningObjective: 'Use descriptive language and sensory details in writing', description: 'Identify and use vivid, descriptive language and sensory details.', estimatedMasteryTime: 30 },
  ],
};

export const GRADES = ['Grade 5', 'Grade 6'] as const;
export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export const QUESTIONS_PER_DIFFICULTY = 4;

/**
 * Provider routing — kept as one config object so difficulty boundaries
 * can move (e.g. difficulty 4 to DeepSeek) with a one-line change here.
 */
export const QA_PROVIDER_SPLIT = {
  alwaysOpenAiTopics: ['Reading Comprehension', 'Writing'],
  deepSeekMaxDifficulty: 3, // difficulties <= this go to DeepSeek (unless topic is always-OpenAI)
};

export function providerFor(topic: string, difficulty: number): 'openai' | 'deepseek' {
  if (QA_PROVIDER_SPLIT.alwaysOpenAiTopics.includes(topic)) return 'openai';
  return difficulty <= QA_PROVIDER_SPLIT.deepSeekMaxDifficulty ? 'deepseek' : 'openai';
}

export const QA_PASS_SAMPLE_RATE = 0.15;
