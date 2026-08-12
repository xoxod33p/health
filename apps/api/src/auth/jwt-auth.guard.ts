import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { AuthenticatedRequest } from './auth.types';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class MongoJwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const jwtSecret = this.config.get<string>('JWT_SECRET') ?? 'development_jwt_secret_32_chars_long!';

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing. Please sign in to access this resource.');
    }

    try {
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret, { issuer: 'healthcare-api', audience: 'authenticated' });

      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.users.findOne({ authUserId: payload.sub, status: 'ACTIVE' }).lean().exec();
      if (!user) {
        throw new UnauthorizedException('Application profile not found or user is inactive');
      }

      request.user = {
        authUserId: user.authUserId,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractBearerToken(header: string | undefined): string | undefined {
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
