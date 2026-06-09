import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateConversationsMemberDto } from './dto/create-conversations-member.dto';
import { UpdateConversationsMemberDto } from './dto/update-conversations-member.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConversationsMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async isAdmin(conversationId: number, userId: number): Promise<boolean> {
    const m = await this.prisma.conversations_members.findFirst({
      where: { conversation_id: conversationId, user_id: userId, role: 'admin' },
    });
    return !!m;
  }

  async isAdminByMemberId(memberId: number, userId: number): Promise<boolean> {
    const target = await this.prisma.conversations_members.findUnique({ where: { id: memberId } });
    if (!target) throw new NotFoundException();
    return this.isAdmin(target.conversation_id, userId);
  }

  async create(dto: CreateConversationsMemberDto) {
    return await this.prisma.conversations_members.create({ data: dto });
  }

  async findForUser(userId: number) {
    const memberships = await this.prisma.conversations_members.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    const convIds = memberships.map((m) => m.conversation_id);
    return this.prisma.conversations_members.findMany({
      where: { conversation_id: { in: convIds } },
      include: { users: { select: { id: true, name: true, email: true, avatar_url: true } } },
    });
  }

  async findOneForUser(id: number, userId: number) {
    const member = await this.prisma.conversations_members.findUnique({ where: { id } });
    if (!member) throw new NotFoundException();
    const isMember = await this.prisma.conversations_members.findFirst({
      where: { conversation_id: member.conversation_id, user_id: userId },
    });
    if (!isMember) throw new ForbiddenException();
    return member;
  }

  async update(id: number, dto: UpdateConversationsMemberDto) {
    return this.prisma.conversations_members.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.conversations_members.delete({ where: { id } });
  }
}
