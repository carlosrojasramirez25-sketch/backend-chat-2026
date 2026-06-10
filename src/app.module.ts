import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ConversationsMembersModule } from './conversations-members/conversations-members.module';
import { ChatModule } from './chat/chat.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    // 5 requests per 60 seconds per IP on throttled endpoints
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    UsersModule,
    AuthModule,
    PrismaModule,
    ConversationsModule,
    MessagesModule,
    ConversationsMembersModule,
    ChatModule,
    AttachmentsModule,
    PushModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}