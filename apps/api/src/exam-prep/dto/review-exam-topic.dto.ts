import { IsEnum } from 'class-validator';

export enum ExamTopicAction {
  Confirm = 'confirm',
  Reject = 'reject',
}

export class ReviewExamTopicDto {
  @IsEnum(ExamTopicAction)
  action: ExamTopicAction;
}
