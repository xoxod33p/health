import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { hashPassword } from '../auth/password.util';

interface BootstrapUser {
  authUserId: string;
  companyId: string;
  role: string;
  status: string;
  email: string;
  passwordHash: string;
  salt: string;
}

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

async function bootstrap(): Promise<void> {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  const role = process.env.DEFAULT_ADMIN_ROLE ?? 'COMPANY_ADMIN';
  const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID ?? 'development-company';
  const mongodbUri = process.env.MONGODB_URI;

  if (!email || !password || !mongodbUri) {
    throw new Error('Missing admin or MongoDB environment configuration');
  }

  const { passwordHash, salt } = hashPassword(password);

  await mongoose.connect(mongodbUri);
  const userSchema = new mongoose.Schema<BootstrapUser>({
    authUserId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, required: true, index: true },
    role: { type: String, required: true },
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
      companyId,
      status: 'ACTIVE',
    });
  }

  await mongoose.disconnect();
  console.log(`Native MongoDB Admin ready: ${email}`);
}

bootstrap().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Admin bootstrap failed');
  process.exitCode = 1;
});
