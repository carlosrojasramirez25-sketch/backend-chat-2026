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
    const dto = { ...createMessageDto, sender_id: user.id };
    if ((dto.type === 'image' || dto.type === 'audio') && dto.content) {
      if (!dto.content.startsWith('https://') && !dto.content.startsWith('http://')) {
        throw new BadRequestException('Contenido inválido para este tipo de mensaje');
      }
    }
    return this.messagesService.create(dto);
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