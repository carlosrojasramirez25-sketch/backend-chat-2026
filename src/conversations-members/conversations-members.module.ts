import { Module } from '@nestjs/common';
import { ConversationsMembersService } from './conversations-members.service';
import { ConversationsMembersController } from './conversations-members.controller';

@Module({
  controllers: [ConversationsMembersController],
  providers: [ConversationsMembersService],
  exports: [ConversationsMembersService]
})
export class ConversationsMembersModule {}
