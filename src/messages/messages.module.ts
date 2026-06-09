import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, JwtAuthGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
