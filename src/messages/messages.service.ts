import { Injectable, ForbiddenException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessagesService {
 
  constructor(private readonly prisma:PrismaService){}

 async create(createMessageDto: CreateMessageDto) {
    return await this.prisma.messages.create({ data:createMessageDto });
  }

  async createWithSender(createMessageDto: CreateMessageDto) {
    return await this.prisma.messages.create({
      data: createMessageDto,
      include: {
        users: { select: { id: true, name: true, email: true, avatar_url: true } },
        messages: { select: { id: true, content: true, sender_id: true, type: true, users: { select: { name: true } } } },
      }
    });
  }

 async findAllForUser(conversationId: number, userId: number) {
    const member = await this.prisma.conversations_members.findFirst({
      where: { conversation_id: conversationId, user_id: userId },
    });
    if (!member) throw new ForbiddenException('No tienes acceso a esta conversación');
    return this.findAll(conversationId);
  }

  async findAll(conversationId?: number) {
    if (conversationId) {
      return await this.prisma.messages.findMany({
        where: { conversation_id: conversationId, is_deleted: false },
        include: {
          users: { select: { id: true, name: true, email: true, avatar_url: true } },
          messages: { select: { id: true, content: true, sender_id: true, type: true, users: { select: { name: true } } } },
        },
        orderBy: { created_at: 'asc' }
      });
    }
    return await this.prisma.messages.findMany({ orderBy: { created_at: 'asc' } });
  }

 async findOne(id: number) {
    return await this.prisma.messages.findUnique({ where:{ id } });
  }

async  update(id: number, updateMessageDto: UpdateMessageDto) {
    return await this.prisma.messages.update({
      where: { id },
      data: updateMessageDto 
    });
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }
}
