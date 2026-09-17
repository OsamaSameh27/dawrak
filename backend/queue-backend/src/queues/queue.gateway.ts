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
import { NotificationType, Prisma, Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

interface NotificationContent {
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
  ticketId?: string;
}

type AuthenticatedSocket = Socket & {
  data: Socket['data'] & { userId?: string; role?: Role; branchId?: string | null };
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
        select: { id: true, isActive: true, role: true, branchId: true },
      });

      if (!user?.isActive) {
        throw new Error('Inactive user');
      }

      client.data.userId = user.id;
      client.data.role = user.role;
      client.data.branchId = user.branchId;
      await client.join(this.userRoom(user.id));
      if (user.branchId) await client.join(this.branchRoom(user.branchId));
      if (user.role === Role.ADMIN) await client.join(this.allCountersRoom());
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

  async notifyServiceOperators(serviceId: string, content: NotificationContent): Promise<void> {
    const sessions = await this.prisma.counterSession.findMany({
      where: {
        counter: { serviceId },
        staff: { role: Role.STAFF, isActive: true },
        lastSeenAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      select: { staffId: true },
      distinct: ['staffId'],
    });
    await this.createNotifications(sessions.map((session) => session.staffId), content);
  }

  async notifyBranchManagers(branchId: string, content: NotificationContent): Promise<void> {
    const managers = await this.prisma.user.findMany({
      where: { branchId, role: Role.MANAGER, isActive: true },
      select: { id: true },
    });
    await this.createNotifications(managers.map((manager) => manager.id), content);
  }

  async notifyAdmins(content: NotificationContent): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    await this.createNotifications(admins.map((admin) => admin.id), content);
  }

  emitCountersUpdated(branchId: string): void {
    this.server
      ?.to(this.branchRoom(branchId))
      .to(this.allCountersRoom())
      .emit('counters.updated', { branchId });
  }

  afterInit(): void {
    this.logger.log('Queue realtime gateway initialized');
  }

  private async createNotifications(userIds: string[], content: NotificationContent): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (!uniqueUserIds.length) return;

    try {
      const notifications = await this.prisma.$transaction(
        uniqueUserIds.map((userId) => this.prisma.notification.create({
          data: {
            userId,
            ticketId: content.ticketId,
            type: content.type,
            title: content.title,
            message: content.message,
            data: content.data,
          },
        })),
      );

      notifications.forEach((notification) => {
        if (notification.userId) this.emitNotification(notification.userId, notification);
      });
    } catch (error) {
      this.logger.error('Failed to create operational notifications', error);
    }
  }

  private serviceRoom(id: string) { return `service:${id}`; }
  private ticketRoom(id: string) { return `ticket:${id}`; }
  private userRoom(id: string) { return `user:${id}`; }
  private branchRoom(id: string) { return `branch:${id}`; }
  private allCountersRoom() { return 'counters:all'; }
}
