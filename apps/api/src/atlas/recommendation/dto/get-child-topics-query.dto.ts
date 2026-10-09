import { IsEnum } from 'class-validator';
import { Curriculum, Grade } from '../../../child/enums/child.enums';
import { Subject } from '../../../learning-session/enums/learning-session.enums';

export class GetChildTopicsQueryDto {
  @IsEnum(Curriculum)
  curriculum: Curriculum;

  @IsEnum(Subject)
  subject: Subject;

  @IsEnum(Grade)
  grade: Grade;
}
