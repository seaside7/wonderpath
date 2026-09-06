import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthResponseDto } from './dto/admin-auth-response.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('admin/auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    return this.adminService.login(dto);
  }
}
