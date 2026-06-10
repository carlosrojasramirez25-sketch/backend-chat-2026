import { Controller, Post, Body, Res, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginAuthDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.loginAuth(dto, res);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('create')
  createUser(@Body() dto: CreateAuthDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.createUser(dto, res);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req.cookies?.['refresh_token'], res);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.cookies?.['refresh_token'], res);
  }
}