import {
  Curriculum,
  Gender,
  Grade,
  PreferredLanguage,
} from '../enums/child.enums';

export class ChildResponseDto {
  id: string;
  fullName: string;
  nickname: string | null;
  dateOfBirth: string;
  gender: Gender;
  grade: Grade;
  curricula: Curriculum[];
  preferredLanguage: PreferredLanguage;
  schoolName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
