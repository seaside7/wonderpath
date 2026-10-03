import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParentProfileDto } from './dto/parent-profile.dto';
import {
  PinVerifyResponseDto,
  SetPinDto,
  VerifyPinDto,
} from './dto/pin.dto';
import { ParentService } from './parent.service';

@Controller()
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: { user: { id: string } }): Promise<ParentProfileDto> {
    return this.parentService.getProfile(req.user.id);
  }

  @Post('me/pin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setPin(
    @Req() req: { user: { id: string } },
    @Body() dto: SetPinDto,
  ): Promise<ParentProfileDto> {
    return this.parentService.setPin(req.user.id, dto.pin);
  }

  @Post('me/pin/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  verifyPin(
    @Req() req: { user: { id: string } },
    @Body() dto: VerifyPinDto,
  ): Promise<PinVerifyResponseDto> {
    return this.parentService.verifyPin(req.user.id, dto.pin);
  }
}
