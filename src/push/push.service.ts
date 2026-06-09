import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {
    webpush.setVapidDetails(
      'mailto:chat@yc.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY!;
  }

  async subscribe(userId: number, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) {
    const existing = await this.prisma.push_subscriptions.findFirst({
      where: { user_id: userId, endpoint: subscription.endpoint },
    });

    if (existing) {
      return this.prisma.push_subscriptions.update({
        where: { id: existing.id },
        data: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      });
    }

    return this.prisma.push_subscriptions.create({
      data: {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async sendToUser(userId: number, payload: { title: string; body: string; icon?: string }) {
    const subs = await this.prisma.push_subscriptions.findMany({
      where: { user_id: userId },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.prisma.push_subscriptions.delete({ where: { id: sub.id } });
        }
      }
    }
  }
}
