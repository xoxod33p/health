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
  console.error('Error: MONGODB_URI environment variable is missing.');
  process.exit(1);
}

async function clean() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongodbUri!);

  const collections = await mongoose.connection.db!.collections();
  const collectionNames = collections.map((c) => c.collectionName);

  console.log('Cleaning collections for company:', companyId);

  // 1. Delete customers, sensor_types, sensors, sensor_assignments, sensor_replacements, reports, notifications, audit_logs
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
      const result = await mongoose.connection.db!.collection(name).deleteMany({ companyId });
      console.log(` - Cleared ${name} (${result.deletedCount} items removed)`);
    }
  }

  // 2. Delete non-protected employees
  if (collectionNames.includes('employees')) {
    const result = await mongoose.connection.db!.collection('employees').deleteMany({
      companyId,
      email: { $ne: defaultAdminEmail },
    });
    console.log(` - Cleared non-admin employees (${result.deletedCount} items removed)`);
  }

  // 3. Delete non-protected native users
  if (collectionNames.includes('users')) {
    const result = await mongoose.connection.db!.collection('users').deleteMany({
      email: { $ne: defaultAdminEmail },
    });
    console.log(` - Cleared non-admin users (${result.deletedCount} credentials removed)`);
  }

  // 4. Optionally clean local runtime storage files
  const storagePath = resolve(process.cwd(), 'storage');
  if (fs.existsSync(storagePath)) {
    try {
      const reportsDir = resolve(storagePath, 'reports');
      if (fs.existsSync(reportsDir)) {
        fs.rmSync(reportsDir, { recursive: true, force: true });
        console.log(' - Cleared local storage/reports/ directory');
      }
    } catch {
      // Ignore directory cleanup error if in use
    }
  }

  await mongoose.disconnect();
  console.log('');
  console.log('======================================================');
  console.log(' Seed data wiped successfully!');
  console.log(` Protected root admin account (${defaultAdminEmail}) was preserved.`);
  console.log('======================================================');
}

clean().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Clean failed');
  process.exit(1);
});
