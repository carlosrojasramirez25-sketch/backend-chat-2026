import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, JwtAuthGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
