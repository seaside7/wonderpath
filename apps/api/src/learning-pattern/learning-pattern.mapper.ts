import {
  ChildPersonalityPreference,
  MotivationStyle as PrismaMotivationStyle,
} from '../../generated/prisma/client';
import { MotivationStyle } from './enums/learning-pattern.enums';

export function mapPersonalityToResponse(
  record: ChildPersonalityPreference | null,
) {
  const motivationStyle = record?.motivationStyle
    ? (motivationStyleFromPrisma[
        record.motivationStyle
      ] satisfies MotivationStyle)
    : null;

  return {
    favoriteAnimal: record?.favoriteAnimal ?? null,
    favoriteTheme: record?.favoriteTheme ?? null,
    favoriteColor: record?.favoriteColor ?? null,
    motivationStyle,
  };
}

const motivationStyleFromPrisma: Record<
  PrismaMotivationStyle,
  MotivationStyle
> = {
  [PrismaMotivationStyle.CHEERLEADER]: MotivationStyle.Cheerleader,
  [PrismaMotivationStyle.GENTLE_COACH]: MotivationStyle.GentleCoach,
  [PrismaMotivationStyle.PLAYFUL_BUDDY]: MotivationStyle.PlayfulBuddy,
  [PrismaMotivationStyle.QUIET_SUPPORTER]: MotivationStyle.QuietSupporter,
};

export function mapMotivationStyleToPrisma(
  style: MotivationStyle,
): PrismaMotivationStyle {
  const entries = Object.entries(motivationStyleFromPrisma) as Array<
    [PrismaMotivationStyle, MotivationStyle]
  >;
  const match = entries.find(([, value]) => value === style);
  if (!match) {
    throw new Error(`Unknown motivation style: ${style}`);
  }
  return match[0];
}
