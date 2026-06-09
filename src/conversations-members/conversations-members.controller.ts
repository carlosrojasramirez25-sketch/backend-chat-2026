import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { ConversationsMembersService } from './conversations-members.service';
import { CreateConversationsMemberDto } from './dto/create-conversations-member.dto';
import { UpdateConversationsMemberDto } from './dto/update-conversations-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('conversations-members')
@UseGuards(JwtAuthGuard)
export class ConversationsMembersController {
  constructor(private readonly conversationsMembersService: ConversationsMembersService) {}

  @Post()
  async create(
    @Body() dto: CreateConversationsMemberDto,
    @CurrentUser() user: { id: number },
  ) {
    const isAdmin = await this.conversationsMembersService.isAdmin(dto.conversation_id, user.id);
    if (!isAdmin) throw new ForbiddenException('Solo un admin puede agregar miembros');
    return this.conversationsMembersService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.conversationsMembersService.findForUser(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.conversationsMembersService.findOneForUser(+id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationsMemberDto,
    @CurrentUser() user: { id: number },
  ) {
    const isAdmin = await this.conversationsMembersService.isAdminByMemberId(+id, user.id);
    if (!isAdmin) throw new ForbiddenException('Solo un admin puede modificar miembros');
    return this.conversationsMembersService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    const isAdmin = await this.conversationsMembersService.isAdminByMemberId(+id, user.id);
    if (!isAdmin) throw new ForbiddenException('Solo un admin puede eliminar miembros');
    return this.conversationsMembersService.remove(+id);
  }
}
