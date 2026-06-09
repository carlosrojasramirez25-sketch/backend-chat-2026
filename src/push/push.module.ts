import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [PushService, JwtAuthGuard],
  exports: [PushService],
})
export class PushModule {}
