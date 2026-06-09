import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() user: { id: number },
  ) {
    // force created_by to the authenticated user — never trust the body
    return this.conversationsService.create({ ...createConversationDto, created_by: user.id });
  }

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.conversationsService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    const convo = await this.conversationsService.findOne(+id);
    if (!convo) throw new NotFoundException();
    const isMember = await this.conversationsService.isMember(+id, user.id);
    if (!isMember) throw new ForbiddenException('No tienes acceso a esta conversación');
    return convo;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @CurrentUser() user: { id: number },
  ) {
    const isMember = await this.conversationsService.isMember(+id, user.id);
    if (!isMember) throw new ForbiddenException('No tienes acceso a esta conversación');
    return this.conversationsService.update(+id, updateConversationDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    const isMember = await this.conversationsService.isMember(+id, user.id);
    if (!isMember) throw new ForbiddenException('No tienes acceso a esta conversación');
    return this.conversationsService.remove(+id);
  }
}
