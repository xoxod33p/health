import { config as loadDotenv } from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { hashPassword } from '../auth/password.util';
import { ROLE_PERMISSIONS } from '../auth/permissions';

loadDotenv({ path: resolve(__dirname, '../../../../.env') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://healthcare:healthcare_prod_secret_123!@localhost:27017/healthcare?authSource=admin';

const VALID_ROLES = ['SYSTEM_ADMIN', 'MANAGER', 'INHOUSE_STAFF', 'OUT_EMPLOYEE'];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase() || 'list';

  console.log(`============================================================`);
  console.log(` CareSignal CLI: Terminal User & Role Management`);
  console.log(`============================================================`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  const usersCollection = db.collection('users');
  const employeesCollection = db.collection('employees');

  try {
    if (command === 'list') {
      const users = await usersCollection.find({}).toArray();
      console.log(`\nRegistered Users in MongoDB (${users.length} accounts):`);
      console.log(`--------------------------------------------------------------------------------`);
      users.forEach((u, i) => {
        const perms = Array.isArray(u.permissions) && u.permissions.length > 0
          ? u.permissions.join(', ')
          : (ROLE_PERMISSIONS[u.role as string] || []).join(', ');
        console.log(`[${i + 1}] Email: ${u.email}`);
        console.log(`    Role: ${u.role} | Status: ${u.status || 'ACTIVE'}`);
        console.log(`    Permissions: ${perms}`);
        console.log(`--------------------------------------------------------------------------------`);
      });
    } else if (command === 'set-role') {
      const targetEmail = args[1]?.toLowerCase();
      const newRole = args[2]?.toUpperCase();

      if (!targetEmail || !newRole) {
        console.error('Error: Missing arguments. Usage: npm run user:set-role <email> <role>');
        console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
      }

      if (!VALID_ROLES.includes(newRole)) {
        console.error(`Error: Invalid role "${newRole}". Valid roles are: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
      }

      const defaultPerms = ROLE_PERMISSIONS[newRole] || [];
      const userResult = await usersCollection.updateOne(
        { email: targetEmail },
        { $set: { role: newRole, permissions: defaultPerms } }
      );
      await employeesCollection.updateOne(
        { email: targetEmail },
        { $set: { role: newRole, permissions: defaultPerms } }
      );

      if (userResult.matchedCount === 0) {
        console.error(`Error: User with email "${targetEmail}" not found.`);
      } else {
        console.log(` SUCCESS: User "${targetEmail}" updated to role "${newRole}" with ${defaultPerms.length} permissions.`);
      }
    } else if (command === 'set-permissions') {
      const targetEmail = args[1]?.toLowerCase();
      const rawPerms = args[2];

      if (!targetEmail || !rawPerms) {
        console.error('Error: Missing arguments. Usage: npm run user:set-permissions <email> <perm1,perm2>');
        process.exit(1);
      }

      const permsArray = rawPerms.split(',').map((p) => p.trim()).filter(Boolean);
      const userResult = await usersCollection.updateOne(
        { email: targetEmail },
        { $set: { permissions: permsArray } }
      );
      await employeesCollection.updateOne(
        { email: targetEmail },
        { $set: { permissions: permsArray } }
      );

      if (userResult.matchedCount === 0) {
        console.error(`Error: User with email "${targetEmail}" not found.`);
      } else {
        console.log(` SUCCESS: Updated user "${targetEmail}" permissions to: [${permsArray.join(', ')}]`);
      }
    } else if (command === 'create') {
      const email = args[1]?.toLowerCase();
      const password = args[2];
      const role = (args[3]?.toUpperCase() || 'SYSTEM_ADMIN');

      if (!email || !password) {
        console.error('Error: Missing arguments. Usage: npm run user:create <email> <password> [role]');
        process.exit(1);
      }

      if (!VALID_ROLES.includes(role)) {
        console.error(`Error: Invalid role "${role}". Valid roles are: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
      }

      const { passwordHash, salt } = hashPassword(password);
      const authUserId = `user_${Date.now()}`;
      const defaultPerms = ROLE_PERMISSIONS[role] || [];
      const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID || 'development-company';

      await usersCollection.updateOne(
        { email },
        {
          $set: {
            authUserId,
            email,
            companyId,
            role,
            permissions: defaultPerms,
            status: 'ACTIVE',
            passwordHash,
            salt,
          },
        },
        { upsert: true }
      );

      const nameParts = email.split('@')[0]?.split('.') || ['User', 'Account'];
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'User';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Account';

      await employeesCollection.updateOne(
        { email },
        {
          $set: {
            authUserId,
            email,
            companyId,
            firstName,
            lastName,
            role,
            permissions: defaultPerms,
            status: 'ACTIVE',
            title: 'CLI Managed Account',
          },
        },
        { upsert: true }
      );

      console.log(` SUCCESS: User "${email}" created with role "${role}" and permissions: [${defaultPerms.join(', ')}]`);
    } else {
      console.log(`Available Terminal Commands:`);
      console.log(`  npx tsx apps/api/src/scripts/manage-roles.ts list`);
      console.log(`  npx tsx apps/api/src/scripts/manage-roles.ts set-role <email> <role>`);
      console.log(`  npx tsx apps/api/src/scripts/manage-roles.ts set-permissions <email> <perm1,perm2>`);
      console.log(`  npx tsx apps/api/src/scripts/manage-roles.ts create <email> <password> [role]`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

void main();
