import { Module } from '@nestjs/common';
import { ConversationsMembersService } from './conversations-members.service';
import { ConversationsMembersController } from './conversations-members.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [ConversationsMembersController],
  providers: [ConversationsMembersService, JwtAuthGuard],
  exports: [ConversationsMembersService],
})
export class ConversationsMembersModule {}
