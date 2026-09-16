import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

type AuthenticatedSocket = Socket & {
  data: Socket['data'] & { userId?: string };
};

@Public()
@WebSocketGateway({
  namespace: '/queue',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class QueueGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QueueGateway.name);
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth?.token;

    if (typeof token !== 'string' || token.length === 0) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access' || !this.uuidPattern.test(payload.sub)) {
        throw new Error('Invalid access token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });

      if (!user?.isActive) {
        throw new Error('Inactive user');
      }

      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('queue.subscribe')
  subscribeQueue(@ConnectedSocket() client: Socket, @MessageBody() payload: { serviceId?: string }) {
    if (!payload?.serviceId || !this.uuidPattern.test(payload.serviceId)) return { ok: false };
    void client.join(this.serviceRoom(payload.serviceId));
    return { ok: true, serviceId: payload.serviceId };
  }

  @SubscribeMessage('ticket.subscribe')
  subscribeTicket(@ConnectedSocket() client: Socket, @MessageBody() payload: { publicId?: string }) {
    if (!payload?.publicId || !this.uuidPattern.test(payload.publicId)) return { ok: false };
    void client.join(this.ticketRoom(payload.publicId));
    return { ok: true, publicId: payload.publicId };
  }

  emitQueueUpdated(serviceId: string, snapshot: unknown): void {
    this.server?.to(this.serviceRoom(serviceId)).emit('queue.updated', snapshot);
  }

  emitTicketUpdated(publicId: string, ticket: unknown): void {
    this.server?.to(this.ticketRoom(publicId)).emit('ticket.updated', ticket);
  }

  emitTicketCalled(serviceId: string, payload: unknown): void {
    this.server?.to(this.serviceRoom(serviceId)).emit('ticket.called', payload);
  }

  emitNotification(userId: string, notification: unknown): void {
    this.server?.to(this.userRoom(userId)).emit('notification.created', notification);
  }

  afterInit(): void {
    this.logger.log('Queue realtime gateway initialized');
  }

  private serviceRoom(id: string) { return `service:${id}`; }
  private ticketRoom(id: string) { return `ticket:${id}`; }
  private userRoom(id: string) { return `user:${id}`; }
}
