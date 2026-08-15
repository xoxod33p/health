import { config } from 'dotenv';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import * as fs from 'node:fs';

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID || 'development-company';
const defaultAdminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@localhost.test').toLowerCase().trim();
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  
  process.exit(1);
}

async function clean() {
  
  await mongoose.connect(mongodbUri!);

  const collections = await mongoose.connection.db!.collections();
  const collectionNames = collections.map((c) => c.collectionName);

  

  
  const companyScopedCollections = [
    'customers',
    'sensor_types',
    'sensors',
    'sensor_assignments',
    'sensor_replacements',
    'reports',
    'notifications',
    'audit_logs',
  ];

  for (const name of companyScopedCollections) {
    if (collectionNames.includes(name)) {
      await mongoose.connection.db!.collection(name).deleteMany({ companyId });
    }
  }

  if (collectionNames.includes('employees')) {
    await mongoose.connection.db!.collection('employees').deleteMany({
      companyId,
      email: { $ne: defaultAdminEmail },
    });
  }

  if (collectionNames.includes('users')) {
    await mongoose.connection.db!.collection('users').deleteMany({
      email: { $ne: defaultAdminEmail },
    });
  }

  const storagePath = resolve(process.cwd(), 'storage');
  if (fs.existsSync(storagePath)) {
    try {
      const reportsDir = resolve(storagePath, 'reports');
      if (fs.existsSync(reportsDir)) {
        fs.rmSync(reportsDir, { recursive: true, force: true });
      }
    } catch {
    }
  }

  await mongoose.disconnect();
}

clean().catch(async () => {
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
