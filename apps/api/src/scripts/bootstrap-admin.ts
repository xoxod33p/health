import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';

interface BootstrapUser {
  authUserId: string;
  companyId: string;
  role: string;
  status: string;
  email: string;
}

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

async function bootstrap(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  const role = process.env.DEFAULT_ADMIN_ROLE ?? 'COMPANY_ADMIN';
  const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID ?? 'development-company';
  const mongodbUri = process.env.MONGODB_URI;

  if (!supabaseUrl || !supabaseSecret || !email || !password || !mongodbUri) {
    throw new Error('Missing Supabase, admin, or MongoDB environment configuration');
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { autoRefreshToken: false, persistSession: false } });
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw new Error(`Supabase list users failed: ${users.error.message}`);
  const existing = users.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  const authResult = existing
    ? await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { role, companyId } })
    : await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, companyId } });
  if (authResult.error) throw new Error(`Supabase admin user failed: ${authResult.error.message}`);
  const authUser = authResult.data.user;

  if (!authUser) throw new Error('Supabase did not return the admin user');

  await mongoose.connect(mongodbUri);
  const userSchema = new mongoose.Schema<BootstrapUser>({
    authUserId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    status: { type: String, required: true, default: 'ACTIVE' },
    email: { type: String, required: true },
  }, { collection: 'users', timestamps: true });
  const UserModel = mongoose.models.User as mongoose.Model<BootstrapUser> | undefined ?? mongoose.model<BootstrapUser>('User', userSchema);
  await UserModel.findOneAndUpdate({ authUserId: authUser.id }, { authUserId: authUser.id, companyId, role, status: 'ACTIVE', email }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
  await mongoose.disconnect();
  console.log(`Development admin ready: ${email}`);
}

bootstrap().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Admin bootstrap failed');
  process.exitCode = 1;
});
