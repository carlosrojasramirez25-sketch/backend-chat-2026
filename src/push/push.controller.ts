import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @Body() body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } },
    @CurrentUser() user: { id: number },
  ) {
    return this.pushService.subscribe(user.id, body.subscription);
  }
}
