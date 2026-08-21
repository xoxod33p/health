import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { LoginDto } from './dto/login.dto';
import { verifyPassword } from './password.util';

@Injectable()
export class AuthService {
  private readonly defaultAdminEmail: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {
    this.defaultAdminEmail = (
      this.config.get<string>('DEFAULT_ADMIN_EMAIL') ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@localhost.test'
    )
      .toLowerCase()
      .trim();
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ email, status: 'ACTIVE' }).exec();
    if (!user || !user.passwordHash || !user.salt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = verifyPassword(dto.password, user.passwordHash, user.salt);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();
    user.lastActiveAt = now;
    await this.users.updateOne({ _id: user._id }, { $set: { lastActiveAt: now } }).exec();

    const token = await this.signToken(user);
    const isDefaultAdmin = user.email.toLowerCase().trim() === this.defaultAdminEmail;
    return {
      access_token: token,
      user: {
        id: user.authUserId,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        isDefaultAdmin,
      },
    };
  }

  async me(authUserId: string) {
    const user = await this.users.findOne({ authUserId, status: 'ACTIVE' }).lean().exec();
    if (!user) throw new UnauthorizedException('User profile not found');
    const isDefaultAdmin = user.email.toLowerCase().trim() === this.defaultAdminEmail;
    return {
      id: user.authUserId,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isDefaultAdmin,
    };
  }

  private async signToken(user: UserDocument): Promise<string> {
    const { SignJWT } = await import('jose');
    const jwtSecret = this.config.get<string>('JWT_SECRET') ?? 'development_jwt_secret_32_chars_long!';
    const secret = new TextEncoder().encode(jwtSecret);

    return new SignJWT({
      sub: user.authUserId,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('healthcare-api')
      .setAudience('authenticated')
      .setExpirationTime('7d')
      .sign(secret);
  }
}
