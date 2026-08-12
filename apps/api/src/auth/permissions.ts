import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  SYSTEM_ADMIN: ['*'],
  MANAGER: ['company.view', 'company.update', 'employee.view', 'employee.create', 'employee.update', 'employee.delete', 'customer.view', 'customer.create', 'customer.update', 'customer.delete', 'sensor.view', 'sensor.create', 'sensor.update', 'sensor.assign', 'sensor.replace', 'sensor.disable', 'report.view', 'report.export', 'notification.view', 'notification.manage', 'audit.view', 'settings.view', 'settings.update'],
  INHOUSE_STAFF: ['customer.view', 'customer.update', 'employee.view', 'sensor.view', 'sensor.create', 'sensor.update', 'sensor.assign', 'report.view', 'notification.view'],
  OUT_EMPLOYEE: ['customer.view', 'sensor.view', 'sensor.update', 'sensor.assign', 'notification.view'],
};

export function roleHasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}
