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

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly messagesService: MessagesService) {}

  // cuando un usuario se conecta
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(`user_${userId}`);
      console.log(`Cliente conectado: ${client.id} unido a user_${userId}`);
    } else {
      console.log(`Cliente conectado sin userId: ${client.id}`);
    }
  }

  // cuando un usuario se desconecta
  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // el usuario entra a una conversación
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conversation_${conversationId}`);
    console.log(`Cliente ${client.id} entró a conversation_${conversationId}`);
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
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    // guarda en BD incluyendo datos del sender
    const message = await this.messagesService.createWithSender(dto);

    // emite a todos en la conversación incluyendo al sender
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
    // emite a todos en la sala menos al que está escribiendo
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
    @ConnectedSocket() client: Socket,
  ) {
    // Notifica al participante destino en su sala personal
    this.server.to(`user_${data.targetUserId}`).emit('conversationCreated', {
      id: data.conversationId,
      participant: {
        id: data.creatorId,
        name: data.creatorName,
        email: data.creatorEmail
      },
      lastMessage: 'Chat iniciado',
      updatedAt: new Date().toISOString()
    });
    console.log(`Notificado chat nuevo al usuario ${data.targetUserId}`);
  }
}