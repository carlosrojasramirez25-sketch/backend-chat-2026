import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessagesService {

  constructor(private readonly prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto) {
    return await this.prisma.messages.create({ data: createMessageDto });
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
    return await this.prisma.messages.findUnique({ where: { id } });
  }

  async findOneForUser(id: number, userId: number) {
    const msg = await this.prisma.messages.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    const member = await this.prisma.conversations_members.findFirst({
      where: { conversation_id: msg.conversation_id, user_id: userId },
    });
    if (!member) throw new ForbiddenException('No tienes acceso a este mensaje');
    return msg;
  }

  async updateIfOwner(id: number, userId: number, updateMessageDto: UpdateMessageDto) {
    const msg = await this.prisma.messages.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    if (msg.sender_id !== userId) throw new ForbiddenException('Solo puedes editar tus propios mensajes');
    return this.prisma.messages.update({ where: { id }, data: updateMessageDto });
  }

  async softDeleteIfOwner(id: number, userId: number) {
    const msg = await this.prisma.messages.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    if (msg.sender_id !== userId) throw new ForbiddenException('Solo puedes eliminar tus propios mensajes');
    return this.prisma.messages.update({ where: { id }, data: { is_deleted: true } });
  }

  async update(id: number, updateMessageDto: UpdateMessageDto) {
    return await this.prisma.messages.update({ where: { id }, data: updateMessageDto });
  }
}