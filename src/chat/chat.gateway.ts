import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { CreateMessageDto } from '../messages/dto/create-message.dto';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Maps socket.id → userId so we can identify the user on disconnect
  private connectedUsers = new Map<string, number>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
  ) {}

  // cuando un usuario se conecta
  async handleConnection(client: Socket) {
    const userIdRaw = client.handshake.query.userId;
    const userId = Number(userIdRaw);
    if (!userId || isNaN(userId)) {
      console.log(`Cliente conectado sin userId: ${client.id}`);
      return;
    }

    this.connectedUsers.set(client.id, userId);
    client.join(`user_${userId}`);
    console.log(`Cliente conectado: ${client.id} unido a user_${userId}`);

    try {
      const now = new Date();
      await this.prisma.users.update({
        where: { id: userId },
        data: { status: 'online', last_seen_at: now },
      });

      // Notify all conversations this user belongs to
      const memberships = await this.prisma.conversations_members.findMany({
        where: { user_id: userId },
        select: { conversation_id: true },
      });

      const nowIso = now.toISOString();
      for (const m of memberships) {
        this.server
          .to(`conversation_${m.conversation_id}`)
          .emit('userStatusChanged', {
            userId,
            status: 'online',
            last_seen_at: nowIso,
          });
      }
    } catch (err) {
      console.error('Error updating user status on connect:', err);
    }
  }

  // cuando un usuario se desconecta
  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    if (!userId) {
      console.log(`Cliente desconectado sin userId: ${client.id}`);
      return;
    }

    console.log(`Cliente desconectado: ${client.id} (user_${userId})`);

    try {
      const now = new Date();
      await this.prisma.users.update({
        where: { id: userId },
        data: { status: 'offline', last_seen_at: now },
      });

      const memberships = await this.prisma.conversations_members.findMany({
        where: { user_id: userId },
        select: { conversation_id: true },
      });

      const nowIso = now.toISOString();
      for (const m of memberships) {
        this.server
          .to(`conversation_${m.conversation_id}`)
          .emit('userStatusChanged', {
            userId,
            status: 'offline',
            last_seen_at: nowIso,
          });
      }
    } catch (err) {
      console.error('Error updating user status on disconnect:', err);
    }
  }

  // el usuario entra a una conversación
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conversation_${conversationId}`);
    console.log(`Cliente ${client.id} entró a conversation_${conversationId}`);

    // Immediately send current status of all members to the joining client
    try {
      const members = await this.prisma.conversations_members.findMany({
        where: { conversation_id: conversationId },
        include: {
          users: { select: { id: true, status: true, last_seen_at: true } },
        },
      });

      for (const m of members) {
        client.emit('userStatusChanged', {
          userId: m.users.id,
          status: m.users.status,
          last_seen_at: m.users.last_seen_at?.toISOString() ?? null,
        });
      }
    } catch (err) {
      console.error('Error fetching member statuses on joinRoom:', err);
    }
  }

  // el usuario sale de una conversación
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation_${conversationId}`);
  }

  // enviar mensaje
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() dto: CreateMessageDto & { sender_avatar?: string },
  ) {
    // sender_avatar no es columna de messages — se extrae antes de pasar a Prisma
    const { sender_avatar: _ignored, ...messageData } = dto;
    const message = await this.messagesService.createWithSender(messageData as CreateMessageDto);
    this.server
      .to(`conversation_${dto.conversation_id}`)
      .emit('newMessage', message);
    return message;
  }

  // indicador de "escribiendo..."
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversation_id: number; user_id: number },
    @ConnectedSocket() client: Socket,
  ) {
    client
      .to(`conversation_${data.conversation_id}`)
      .emit('userTyping', { user_id: data.user_id });
  }

  // registro manual de usuario en su sala personal
  @SubscribeMessage('registerUser')
  handleRegisterUser(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user_${userId}`);
    console.log(`Cliente ${client.id} se registró en user_${userId}`);
    return { success: true };
  }

  // cuando un usuario actualiza su foto de perfil, persistir y notificar a sus contactos
  @SubscribeMessage('profilePhotoUpdate')
  async handleProfilePhotoUpdate(
    @MessageBody() data: { userId: number; avatar_url: string },
  ) {
    const { userId, avatar_url } = data;

    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { avatar_url },
      });

      const myConvos = await this.prisma.conversations_members.findMany({
        where: { user_id: userId },
        select: { conversation_id: true },
      });
      const convIds = myConvos.map((m) => m.conversation_id);

      const contacts = await this.prisma.conversations_members.findMany({
        where: { conversation_id: { in: convIds }, user_id: { not: userId } },
        select: { user_id: true },
        distinct: ['user_id'],
      });

      for (const c of contacts) {
        this.server
          .to(`user_${c.user_id}`)
          .emit('profilePhotoUpdate', { userId, avatar_url });
      }
    } catch (err) {
      console.error('Error handling profilePhotoUpdate:', err);
    }
  }

  // notificar creación de nueva conversación al participante destino
  @SubscribeMessage('newConversation')
  handleNewConversation(
    @MessageBody() data: {
      conversationId: number;
      targetUserId: number;
      creatorId: number;
      creatorName: string;
      creatorEmail: string;
    },
  ) {
    this.server.to(`user_${data.targetUserId}`).emit('conversationCreated', {
      id: data.conversationId,
      participant: {
        id: data.creatorId,
        name: data.creatorName,
        email: data.creatorEmail,
      },
      lastMessage: 'Chat iniciado',
      updatedAt: new Date().toISOString(),
    });
    console.log(`Notificado chat nuevo al usuario ${data.targetUserId}`);
  }
}