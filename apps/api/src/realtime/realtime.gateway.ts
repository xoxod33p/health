import { ConfigService } from '@nestjs/config';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private readonly config: ConfigService, @InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = socket.handshake.auth?.token;
      const companyId = await this.resolveCompany(typeof token === 'string' ? token : undefined);
      await socket.join(this.companyRoom(companyId));
      socket.emit('realtime.ready', { companyId });
    } catch {
      socket.emit('realtime.error', { message: 'Realtime authentication failed' });
      socket.disconnect(true);
    }
  }

  broadcastCompany(companyId: string, event: string, payload: Record<string, unknown> = {}): void {
    this.server.to(this.companyRoom(companyId)).emit(event, payload);
  }

  private companyRoom(companyId: string): string { return `company:${companyId}`; }

  private async resolveCompany(token: string | undefined): Promise<string> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (!token || !supabaseUrl) throw new UnauthorizedException();
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer: `${supabaseUrl}/auth/v1`, audience: 'authenticated' });
    if (typeof payload.sub !== 'string') throw new UnauthorizedException();
    const user = await this.users.findOne({ authUserId: payload.sub, status: 'ACTIVE' }).lean().exec();
    if (!user) throw new UnauthorizedException();
    return user.companyId;
  }
}
