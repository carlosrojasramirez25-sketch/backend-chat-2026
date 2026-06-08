import { Injectable } from '@nestjs/common';
import { CreateConversationsMemberDto } from './dto/create-conversations-member.dto';
import { UpdateConversationsMemberDto } from './dto/update-conversations-member.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConversationsMembersService {
 
  constructor(private readonly prisma:PrismaService){}

async  create(createConversationsMemberDto: CreateConversationsMemberDto) {
    return await this.prisma.conversations_members.create({
      data:createConversationsMemberDto
    });
  }

  findAll() {
    return `This action returns all conversationsMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} conversationsMember`;
  }

  update(id: number, updateConversationsMemberDto: UpdateConversationsMemberDto) {
    return `This action updates a #${id} conversationsMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} conversationsMember`;
  }
}
