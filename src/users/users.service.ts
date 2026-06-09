import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

const PUBLIC_FIELDS = { id: true, name: true, email: true, avatar_url: true, status: true, last_seen_at: true };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return await this.prisma.users.create({ data: createUserDto });
  }

  findAll() {
    return this.prisma.users.findMany({ select: PUBLIC_FIELDS });
  }

  async findOne(id: number) {
    return await this.prisma.users.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.users.update({ where: { id }, data: updateUserDto, select: PUBLIC_FIELDS });
  }

  async findByEmail(email: string) {
    return await this.prisma.users.findUnique({ where: { email } });
  }

  async areContacts(userId: number, targetId: number): Promise<boolean> {
    const myConvos = await this.prisma.conversations_members.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    if (myConvos.length === 0) return false;
    const convIds = myConvos.map((m) => m.conversation_id);
    const shared = await this.prisma.conversations_members.findFirst({
      where: { conversation_id: { in: convIds }, user_id: targetId },
    });
    return !!shared;
  }

  async findContactsOf(userId: number) {
    const memberships = await this.prisma.conversations_members.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    const convIds = memberships.map((m) => m.conversation_id);
    if (convIds.length === 0) return [];
    const members = await this.prisma.conversations_members.findMany({
      where: { conversation_id: { in: convIds }, user_id: { not: userId } },
      select: { user_id: true, users: { select: PUBLIC_FIELDS } },
    });
    const seen = new Set<number>();
    return members
      .filter((m) => { if (seen.has(m.user_id)) return false; seen.add(m.user_id); return true; })
      .map((m) => m.users);
  }
}
