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

  
  
  

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  const usersCollection = db.collection('users');
  const employeesCollection = db.collection('employees');

  try {
    if (command === 'list') {
      await usersCollection.find({}).toArray();
    } else if (command === 'set-role') {
      const targetEmail = args[1]?.toLowerCase();
      const newRole = args[2]?.toUpperCase();

      if (!targetEmail || !newRole) {
        
        
        process.exit(1);
      }

      if (!VALID_ROLES.includes(newRole)) {
        
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
        
      } else {
        
      }
    } else if (command === 'set-permissions') {
      const targetEmail = args[1]?.toLowerCase();
      const rawPerms = args[2];

      if (!targetEmail || !rawPerms) {
        
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
        
      } else {
        
      }
    } else if (command === 'create') {
      const email = args[1]?.toLowerCase();
      const password = args[2];
      const role = (args[3]?.toUpperCase() || 'SYSTEM_ADMIN');

      if (!email || !password) {
        
        process.exit(1);
      }

      if (!VALID_ROLES.includes(role)) {
        
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

      
    } else {
      
      
      
      
      
    }
  } finally {
    await mongoose.disconnect();
  }
}

void main();
