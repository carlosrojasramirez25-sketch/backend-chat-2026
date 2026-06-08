import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConversationsMembersService } from './conversations-members.service';
import { CreateConversationsMemberDto } from './dto/create-conversations-member.dto';
import { UpdateConversationsMemberDto } from './dto/update-conversations-member.dto';

@Controller('conversations-members')
export class ConversationsMembersController {
  constructor(private readonly conversationsMembersService: ConversationsMembersService) {}

  @Post()
  create(@Body() createConversationsMemberDto: CreateConversationsMemberDto) {
    return this.conversationsMembersService.create(createConversationsMemberDto);
  }

  @Get()
  findAll() {
    return this.conversationsMembersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsMembersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConversationsMemberDto: UpdateConversationsMemberDto) {
    return this.conversationsMembersService.update(+id, updateConversationsMemberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conversationsMembersService.remove(+id);
  }
}
