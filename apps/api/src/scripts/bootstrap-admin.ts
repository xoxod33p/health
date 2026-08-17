import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { hashPassword } from '../auth/password.util';
import { ROLE_PERMISSIONS } from '../auth/permissions';

interface BootstrapUser {
  authUserId: string;
  companyId: string;
  role: string;
  permissions?: string[];
  status: string;
  email: string;
  passwordHash: string;
  salt: string;
}

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

async function bootstrap(): Promise<void> {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@caresignal.local').toLowerCase().trim();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'CareSignalAdmin2026!';
  const role = process.env.DEFAULT_ADMIN_ROLE || 'SYSTEM_ADMIN';
  const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID || 'caresignal-production';
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    console.log('[BootstrapAdmin] Skipping admin bootstrap (no MONGODB_URI configured).');
    return;
  }

  const { passwordHash, salt } = hashPassword(password);
  const permissions = Array.from(ROLE_PERMISSIONS[role] ?? []);

  await mongoose.connect(mongodbUri);
  const userSchema = new mongoose.Schema<BootstrapUser>({
    authUserId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] },
    status: { type: String, required: true, default: 'ACTIVE' },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
  }, { collection: 'users', timestamps: true });

  const UserModel = mongoose.models.User as mongoose.Model<BootstrapUser> | undefined ?? mongoose.model<BootstrapUser>('User', userSchema);
  
  let existingUser = await UserModel.findOne({ email }).exec();
  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.salt = salt;
    existingUser.role = role;
    existingUser.permissions = permissions;
    existingUser.companyId = companyId;
    existingUser.status = 'ACTIVE';
    await existingUser.save();
  } else {
    const authUserId = `usr_${randomUUID().replace(/-/g, '')}`;
    await UserModel.create({
      authUserId,
      email,
      passwordHash,
      salt,
      role,
      permissions,
      companyId,
      status: 'ACTIVE',
    });
  }

  await mongoose.disconnect();
  
}

bootstrap().catch(async () => {
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
