import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from 'src/messages/messages.module';
import { PushModule } from 'src/push/push.module';

@Module({
  imports: [MessagesModule, PushModule],
  providers: [ChatGateway],
})
export class ChatModule {}
