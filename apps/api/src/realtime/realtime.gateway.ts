import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';
import { User, UserDocument } from '../users/user.schema';

interface ConnectedUser {
  authUserId: string;
  email: string;
  companyId: string;
}

@Injectable()
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  // Track socketId -> user details
  private readonly socketUsers = new Map<string, ConnectedUser>();

  // Track companyId -> Map<email, Set<socketId>>
  private readonly companyOnlineUsers = new Map<string, Map<string, Set<string>>>();

  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = socket.handshake.auth?.token;
      const user = await this.resolveUser(typeof token === 'string' ? token : undefined);

      this.socketUsers.set(socket.id, user);

      if (!this.companyOnlineUsers.has(user.companyId)) {
        this.companyOnlineUsers.set(user.companyId, new Map());
      }
      const companyMap = this.companyOnlineUsers.get(user.companyId)!;
      const wasOnline = companyMap.has(user.email) && (companyMap.get(user.email)?.size ?? 0) > 0;

      if (!companyMap.has(user.email)) {
        companyMap.set(user.email, new Set());
      }
      companyMap.get(user.email)!.add(socket.id);

      await socket.join(this.companyRoom(user.companyId));

      const onlineEmails = Array.from(companyMap.keys()).filter((email) => (companyMap.get(email)?.size ?? 0) > 0);
      socket.emit('realtime.ready', { companyId: user.companyId, onlineEmails });
      socket.emit('presence.state', { onlineEmails });

      if (!wasOnline) {
        this.broadcastCompany(user.companyId, 'presence.changed', {
          email: user.email,
          authUserId: user.authUserId,
          online: true,
        });
      }
    } catch {
      socket.emit('realtime.error', { message: 'Realtime authentication failed' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const user = this.socketUsers.get(socket.id);
    if (!user) return;
    this.socketUsers.delete(socket.id);

    const companyMap = this.companyOnlineUsers.get(user.companyId);
    if (companyMap && companyMap.has(user.email)) {
      const sockets = companyMap.get(user.email)!;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        companyMap.delete(user.email);
        this.broadcastCompany(user.companyId, 'presence.changed', {
          email: user.email,
          authUserId: user.authUserId,
          online: false,
        });
      }
    }
  }

  broadcastCompany(companyId: string, event: string, payload: Record<string, unknown> = {}): void {
    if (this.server) {
      this.server.to(this.companyRoom(companyId)).emit(event, payload);
    }
  }

  getOnlineUsers(companyId: string): string[] {
    const companyMap = this.companyOnlineUsers.get(companyId);
    if (!companyMap) return [];
    return Array.from(companyMap.keys()).filter((email) => (companyMap.get(email)?.size ?? 0) > 0);
  }

  private companyRoom(companyId: string): string {
    return `company:${companyId}`;
  }

  private async resolveUser(token: string | undefined): Promise<ConnectedUser> {
    const jwtSecret = this.config.get<string>('JWT_SECRET') ?? 'development_jwt_secret_32_chars_long!';
    if (!token) throw new UnauthorizedException('Authentication token is missing');

    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, { issuer: 'healthcare-api', audience: 'authenticated' });

    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.users.findOne({ authUserId: payload.sub, status: 'ACTIVE' }).lean().exec();
    if (!user) {
      throw new UnauthorizedException('Active user account not found');
    }

    return {
      authUserId: user.authUserId,
      email: user.email.toLowerCase().trim(),
      companyId: user.companyId,
    };
  }
}
