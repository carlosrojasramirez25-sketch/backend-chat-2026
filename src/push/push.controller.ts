import { Controller, Get, Post, Body } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('api/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  subscribe(@Body() body: {
    userId: number;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  }) {
    return this.pushService.subscribe(body.userId, body.subscription);
  }
}
