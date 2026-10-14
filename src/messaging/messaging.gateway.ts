import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/messaging' })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private userSockets = new Map<string, string>(); // userId → socketId

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
    }
  }

  @SubscribeMessage('join_conversation')
  joinConversation(@MessageBody() conversationId: string, @ConnectedSocket() client: Socket) {
    client.join(`conv:${conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  leaveConversation(@MessageBody() conversationId: string, @ConnectedSocket() client: Socket) {
    client.leave(`conv:${conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`conv:${data.conversationId}`).emit('typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  // Called by MessagingService after a message is persisted
  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('new_message', message);
  }

  emitMessageRead(conversationId: string, userId: string) {
    this.server.to(`conv:${conversationId}`).emit('message_read', { userId, conversationId });
  }

  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
