import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: { id: number },
  ) {
    // Force sender_id to the authenticated user — never trust the body
    return this.messagesService.create({ ...createMessageDto, sender_id: user.id });
  }

  @Get()
  findAll(
    @Query('conversationId') conversationId: string,
    @CurrentUser() user: { id: number },
  ) {
    if (!conversationId) throw new BadRequestException('conversationId es requerido');
    return this.messagesService.findAllForUser(+conversationId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.messagesService.findOneForUser(+id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.messagesService.updateIfOwner(+id, user.id, updateMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.messagesService.softDeleteIfOwner(+id, user.id);
  }
}