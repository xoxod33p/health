import type { Request } from 'express';

export interface AuthenticatedUser {
  authUserId: string;
  companyId: string;
  role: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
