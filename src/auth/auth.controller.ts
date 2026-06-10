import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5 attempts per minute per IP — blocks brute force
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.loginAuth(dto);
  }

  // 3 registrations per minute per IP — blocks account spam
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('create')
  createUser(@Body() dto: CreateAuthDto) {
    return this.authService.createUser(dto);
  }
}