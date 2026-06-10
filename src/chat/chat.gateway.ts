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
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { CreateMessageDto } from '../messages/dto/create-message.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Maps socket.id → userId so we can identify the user on disconnect
  private connectedUsers = new Map<string, number>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly jwtService: JwtService,
  ) {}

  // cuando un usuario se conecta
  async handleConnection(client: Socket) {
    const userIdRaw = client.handshake.query.userId;
    const userId = Number(userIdRaw);
    const token = client.handshake.auth?.token as string | undefined;

    if (!userId || isNaN(userId) || !token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.id !== userId) {
        client.disconnect();
        return;
      }
    } catch {
      client.disconnect();
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
    @ConnectedSocket() client: Socket,
  ) {
    const socketUserId = this.connectedUsers.get(client.id);
    // Reject if sender_id doesn't match the authenticated socket user
    if (!socketUserId || socketUserId !== dto.sender_id) return;
    const { sender_avatar: _ignored, ...messageData } = dto;
    const message = await this.messagesService.createWithSender(messageData as CreateMessageDto);
    this.server
      .to(`conversation_${dto.conversation_id}`)
      .emit('newMessage', message);

    // Push notification to all members except the sender
    try {
      const members = await this.prisma.conversations_members.findMany({
        where: { conversation_id: dto.conversation_id },
        include: { users: { select: { id: true, name: true } } },
      });
      const senderName = members.find(m => m.user_id === messageData.sender_id)?.users?.name ?? 'Nuevo mensaje';
      for (const member of members) {
        if (member.user_id === messageData.sender_id) continue;
        await this.pushService.sendToUser(member.user_id, {
          title: senderName,
          body: messageData.type === 'image' ? '📷 Imagen' : (messageData.content ?? ''),
          icon: '/icon-192.png',
        });
      }
    } catch (err) {
      console.error('Error sending push notification:', err);
    }

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
    @ConnectedSocket() client: Socket,
  ) {
    const socketUserId = this.connectedUsers.get(client.id);
    if (!socketUserId || socketUserId !== data.userId) return;
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

  // ── Señalización WebRTC ──────────────────────────────────────────────────────

  @SubscribeMessage('callOffer')
  handleCallOffer(@MessageBody() data: { targetUserId: number; callerId: number; callerName: string; offer: any; conversationId: number }) {
    this.server.to(`user_${data.targetUserId}`).emit('incomingCall', data);
  }

  @SubscribeMessage('callAnswer')
  handleCallAnswer(@MessageBody() data: { callerId: number; answer: any }) {
    this.server.to(`user_${data.callerId}`).emit('callAnswered', { answer: data.answer });
  }

  @SubscribeMessage('callReject')
  handleCallReject(@MessageBody() data: { callerId: number }) {
    this.server.to(`user_${data.callerId}`).emit('callRejected');
  }

  @SubscribeMessage('callEnd')
  handleCallEnd(@MessageBody() data: { targetUserId: number }) {
    this.server.to(`user_${data.targetUserId}`).emit('callEnded');
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(@MessageBody() data: { targetUserId: number; candidate: any }) {
    this.server.to(`user_${data.targetUserId}`).emit('iceCandidate', { candidate: data.candidate });
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