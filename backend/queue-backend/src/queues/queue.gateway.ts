import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Public } from '../common/decorators/public.decorator';

@Public()
@WebSocketGateway({
  namespace: '/queue',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class QueueGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QueueGateway.name);
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  afterInit(): void {
    this.logger.log('Queue realtime gateway initialized');
  }

  private serviceRoom(id: string) { return `service:${id}`; }
  private ticketRoom(id: string) { return `ticket:${id}`; }
}
