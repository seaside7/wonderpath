import { Matches } from 'class-validator';

export class SetPinDto {
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}

export class VerifyPinDto {
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}

export class PinVerifyResponseDto {
  valid: boolean;
}
