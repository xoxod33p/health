'use client';

import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Database,
  Edit2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch, getSession } from '../../lib/api';
import { connectPresence } from '../../lib/realtime';

export type UserRole = 'SYSTEM_ADMIN' | 'MANAGER' | 'INHOUSE_STAFF' | 'OUT_EMPLOYEE';

export type SystemStats = {
  customers: number;
  sensors: number;
  sensorTypes: number;
  sensorAssignments: number;
  sensorReplacements: number;
  reports: number;
  notifications: number;
  auditLogs: number;
  users: number;
  employees: number;
  isDefaultAdmin: boolean;
  defaultAdminEmail: string;
};

export type ClearDataResult = {
  success: boolean;
  message: string;
  deletedCounts: {
    customers: number;
    sensors: number;
    sensorTypes: number;
    sensorAssignments: number;
    sensorReplacements: number;
    reports: number;
    notifications: number;
    auditLogs: number;
  };
  preserved: {
    users: number;
    employees: number;
  };
};

export const ROLE_LABELS: Record<UserRole, { label: string; description: string; badgeColor: string; textColor: string; bg: string }> = {
  SYSTEM_ADMIN: { label: 'System Admin', description: 'Full System Administration & Security Controls', badgeColor: '#32776d', textColor: '#32776d', bg: '#e0efeb' },
  MANAGER: { label: 'Manager', description: 'Operations, Sensor Fleet & Customer Management', badgeColor: '#3d5c99', textColor: '#3d5c99', bg: '#e0e9fa' },
  INHOUSE_STAFF: { label: 'Inhouse Employee', description: 'Internal Clinical & In-House Healthcare Staff', badgeColor: '#0f766e', textColor: '#0f766e', bg: '#ccfbf1' },
  OUT_EMPLOYEE: { label: 'Out Employee', description: 'Field Operators & External Field Technicians', badgeColor: '#d97706', textColor: '#d97706', bg: '#fef3c7' },
};

type UserMember = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  authUserId: string;
  role: UserRole;
  permissions?: string[];
  title?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  isProtected?: boolean;
  isOnline?: boolean;
  createdAt?: string;
};

export const PERMISSION_LEVELS: { id: string; name: string; category: string; description: string }[] = [
  { id: 'dashboard.view', name: 'View Dashboard Telemetry', category: 'Analytics', description: 'Access real-time operational health telemetry & alerts' },
  { id: 'dashboard.edit', name: 'Customize Dashboard', category: 'Analytics', description: 'Modify dashboard widgets, parameters, and thresholds' },
  { id: 'sensors.view', name: 'View Sensor Fleet', category: 'Sensors', description: 'Monitor live sensor readings and hardware battery levels' },
  { id: 'sensors.manage', name: 'Manage Sensors & Replacements', category: 'Sensors', description: 'Provision, assign, command, and replace sensors' },
  { id: 'sensor_types.manage', name: 'Sensor Types Catalog', category: 'Sensors', description: 'Create and manage sensor specifications and categories' },
  { id: 'customers.view', name: 'View Customer Directory', category: 'Customers', description: 'View customer accounts and assignment records' },
  { id: 'customers.manage', name: 'Manage Customer Records', category: 'Customers', description: 'Add, update, and manage customer records' },
  { id: 'reports.view', name: 'View & Generate Reports', category: 'Reports', description: 'Generate clinical telemetry, compliance, and battery reports' },
  { id: 'reports.export', name: 'Export Reports (PDF / CSV)', category: 'Reports', description: 'Download generated reports, telemetry data, and audit files' },
  { id: 'users.manage', name: 'User & Staff Management', category: 'Administration', description: 'Create, update, suspend, and configure team member logins' },
  { id: 'roles.manage', name: 'Role & Permission Controls', category: 'Administration', description: 'Modify workspace roles and permission matrix levels' },
  { id: 'audit.view', name: 'Security Audit Trail', category: 'Compliance', description: 'Access immutable system compliance and security activity logs' },
  { id: 'settings.manage', name: 'Workspace Configuration', category: 'Administration', description: 'Configure company profile, security policies, and defaults' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SYSTEM_ADMIN: PERMISSION_LEVELS.map((p) => p.id),
  MANAGER: [
    'dashboard.view',
    'dashboard.edit',
    'sensors.view',
    'sensors.manage',
    'sensor_types.manage',
    'customers.view',
    'customers.manage',
    'reports.view',
    'reports.export',
    'users.manage',
    'audit.view',
  ],
  INHOUSE_STAFF: [
    'dashboard.view',
    'sensors.view',
    'sensors.manage',
    'sensor_types.manage',
    'customers.view',
    'customers.manage',
    'reports.view',
    'reports.export',
  ],
  OUT_EMPLOYEE: [
    'dashboard.view',
    'sensors.view',
    'sensors.manage',
    'customers.view',
  ],
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'maintenance'>('users');
  const [users, setUsers] = useState<UserMember[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default Admin & System Maintenance States
  const [isDefaultAdmin, setIsDefaultAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [confirmClearText, setConfirmClearText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [clearSuccess, setClearSuccess] = useState<ClearDataResult | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('INHOUSE_STAFF');
  const [addFormError, setAddFormError] = useState('');

  const [editRole, setEditRole] = useState<UserRole>('INHOUSE_STAFF');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<UserMember | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [roleMatrixDefaults, setRoleMatrixDefaults] = useState<Record<UserRole, string[]>>(DEFAULT_ROLE_PERMISSIONS);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await apiFetch<SystemStats>('/system/stats');
      setSystemStats(stats);
    } catch {
      // non-blocking
    } finally {
      setStatsLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await getSession();
      const currentUser = sessionData?.session?.user;

      const isDefAdmin = Boolean(
        currentUser?.isDefaultAdmin ||
        currentUser?.email?.toLowerCase().trim() === 'admin@localhost.test'
      );
      setIsDefaultAdmin(isDefAdmin);
      if (currentUser?.email) {
        setCurrentUserEmail(currentUser.email);
      }
      if (isDefAdmin) {
        void fetchStats();
      }

      const apiEmployees = await apiFetch<UserMember[]>('/employees').catch(() => []);
      let combinedList: UserMember[] = Array.isArray(apiEmployees) ? [...apiEmployees] : [];

      if (currentUser?.email) {
        const exists = combinedList.some(
          (u) => u.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        if (!exists) {
          const isRoot = currentUser.email.toLowerCase() === 'admin@localhost.test';
          const userRole = (currentUser.role as UserRole) || 'SYSTEM_ADMIN';
          const authUser: UserMember = {
            _id: currentUser.id,
            firstName: isRoot ? 'Admin' : (currentUser.email.split('@')[0] ?? 'User'),
            lastName: isRoot ? '' : 'Account',
            email: currentUser.email,
            authUserId: currentUser.id,
            role: userRole,
            permissions: DEFAULT_ROLE_PERMISSIONS[userRole] ?? DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN,
            title: isRoot ? 'Primary Administrator' : (ROLE_LABELS[userRole]?.label || 'System Admin'),
            status: 'ACTIVE',
            isProtected: isRoot,
            createdAt: new Date().toISOString().split('T')[0] ?? '',
          };
          combinedList = [authUser, ...combinedList];
        }
      }

      const enrichedUsers = combinedList.map((u) => {
        const isRootAdmin = u.email.toLowerCase() === 'admin@localhost.test' && u.role === 'SYSTEM_ADMIN';
        const firstName = isRootAdmin || (u.firstName?.toLowerCase() === 'admin' && u.lastName?.toLowerCase() === 'admin')
          ? 'Admin'
          : u.firstName;
        const lastName = isRootAdmin || (u.firstName?.toLowerCase() === 'admin' && u.lastName?.toLowerCase() === 'admin')
          ? ''
          : u.lastName;
        return {
          ...u,
          firstName,
          lastName,
          isProtected: Boolean(u.isProtected || isRootAdmin),
          permissions: u.permissions && u.permissions.length > 0 ? u.permissions : DEFAULT_ROLE_PERMISSIONS[u.role] ?? DEFAULT_ROLE_PERMISSIONS.INHOUSE_STAFF,
        };
      });

      setUsers(enrichedUsers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load accounts and permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    let cleanup: (() => void) | undefined;
    void connectPresence(
      (presence) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.email.toLowerCase().trim() === presence.email.toLowerCase().trim()
              ? { ...u, isOnline: presence.online }
              : u
          )
        );
      },
      (onlineEmails) => {
        const emailSet = new Set(onlineEmails.map((e) => e.toLowerCase().trim()));
        setUsers((prev) =>
          prev.map((u) => ({
            ...u,
            isOnline: emailSet.has(u.email.toLowerCase().trim()),
          }))
        );
      }
    ).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (roleFilter === 'All roles' || u.role === roleFilter) &&
          `${u.firstName} ${u.lastName} ${u.email} ${u.title ?? ''} ${ROLE_LABELS[u.role]?.label || u.role}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [users, query, roleFilter]
  );

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddFormError('');

    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      setAddFormError('Please fill in all required fields.');
      return;
    }

    if (!newPassword) {
      setAddFormError('Password is required.');
      return;
    }

    if (newPassword.length < 6) {
      setAddFormError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAddFormError('Passwords do not match. Please ensure Password and Confirm Password are identical.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email: newEmail.trim().toLowerCase(),
        authUserId: `user_${Date.now()}`,
        role: newRole,
        status: 'ACTIVE',
        password: newPassword.trim(),
        permissions: roleMatrixDefaults[newRole] ?? DEFAULT_ROLE_PERMISSIONS[newRole],
        title: ROLE_LABELS[newRole].label,
      };
      await apiFetch<UserMember>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAddModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setAddFormError('');
      await load();
    } catch (caught) {
      setAddFormError(caught instanceof Error ? caught.message : 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (userItem: UserMember) => {
    if (userItem.isProtected) {
      alert('The default environment administrator account is protected and cannot be edited or modified.');
      return;
    }
    setEditingUser(userItem);
    setEditRole(userItem.role);
    setEditPermissions(userItem.permissions ?? DEFAULT_ROLE_PERMISSIONS[userItem.role]);
    setEditModalOpen(true);
  };

  const handleRoleChangeInEdit = (selectedRole: UserRole) => {
    setEditRole(selectedRole);
    setEditPermissions(roleMatrixDefaults[selectedRole] ?? DEFAULT_ROLE_PERMISSIONS[selectedRole]);
  };

  const handleTogglePermission = (permissionId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSaveUserRoleAndPermissions = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;

    if (editingUser.isProtected) {
      alert('The default environment administrator account is protected and cannot be edited or modified.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/employees/${editingUser._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole, permissions: editPermissions }),
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? { ...u, role: editRole, permissions: editPermissions } : u))
      );

      setEditModalOpen(false);
      setEditingUser(null);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to update user role and permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const target = users.find((u) => u._id === id);
    if (target?.isProtected) {
      alert('The default environment administrator account is protected and cannot be suspended.');
      return;
    }

    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to update account status');
    }
  };

  const handleOpenDelete = (user: UserMember) => {
    if (user.isProtected) {
      alert('The default environment administrator account is protected and cannot be deleted.');
      return;
    }
    setDeleteTarget(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await apiFetch(`/employees/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to delete user account');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleToggleRoleMatrixPermission = (roleKey: UserRole, permId: string) => {
    setRoleMatrixDefaults((prev) => {
      const current = prev[roleKey] ?? [];
      const updated = current.includes(permId)
        ? current.filter((p) => p !== permId)
        : [...current, permId];
      return { ...prev, [roleKey]: updated };
    });
  };

  const handleClearAllData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmClearText.trim().toUpperCase() !== 'CLEAR ALL DATA') {
      setClearError('Please type CLEAR ALL DATA exactly as shown to confirm.');
      return;
    }
    setClearing(true);
    setClearError('');
    try {
      const res = await apiFetch<ClearDataResult>('/system/clear-data', {
        method: 'POST',
      });
      setClearSuccess(res);
      setClearModalOpen(false);
      setConfirmClearText('');
      await load();
      await fetchStats();
    } catch (caught) {
      setClearError(caught instanceof Error ? caught.message : 'Failed to clear workspace data');
    } finally {
      setClearing(false);
    }
  };

  const topbarRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {isDefaultAdmin && (
        <button
          type="button"
          className="danger-button"
          onClick={() => {
            setClearModalOpen(true);
            setConfirmClearText('');
            setClearError('');
            void fetchStats();
          }}
          title="Clear all system data except user accounts (Default Admin only)"
        >
          <Trash2 size={15} /> Clear All Data
        </button>
      )}
      <button className="primary-button" onClick={() => setAddModalOpen(true)}>
        <Plus size={17} /> Add user
      </button>
    </div>
  );

  return (
    <AppShell headerActions={topbarRight}>
      <div className="page-content">
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={activeTab === 'users' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('users')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UsersIcon size={16} /> User Directory ({users.length})
          </button>
          <button
            type="button"
            className={activeTab === 'roles' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('roles')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck size={16} /> Role Authorization Matrix
          </button>
          {isDefaultAdmin && (
            <button
              type="button"
              className={activeTab === 'maintenance' ? 'danger-button' : 'secondary-button'}
              onClick={() => {
                setActiveTab('maintenance');
                void fetchStats();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#fca5a5',
                color: '#dc2626',
              }}
            >
              <ShieldAlert size={16} /> System Maintenance (Default Admin)
            </button>
          )}
        </div>

        {activeTab === 'users' && (
          <>
            <section className="mini-stat-grid" style={{ marginBottom: '24px' }}>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Total accounts</span>
                  <UsersIcon size={18} />
                </div>
                <strong>{users.length}</strong>
                <small>Registered users</small>
              </div>
              <div className="mini-stat mini-stat-teal">
                <div className="mini-stat-top">
                  <span>Online Now</span>
                  <span className="live-pulse-badge">LIVE</span>
                </div>
                <strong style={{ color: '#059669' }}>{users.filter((u) => u.isOnline).length}</strong>
                <small>{users.filter((u) => u.isOnline).length} active in workspace</small>
              </div>
              <div className="mini-stat mini-stat-blue">
                <div className="mini-stat-top">
                  <span>System Admins</span>
                  <ShieldCheck size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'SYSTEM_ADMIN').length}</strong>
                <small>Full platform control</small>
              </div>
              <div className="mini-stat mini-stat-amber">
                <div className="mini-stat-top">
                  <span>Staff & Technicians</span>
                  <UserPlus size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'INHOUSE_STAFF' || u.role === 'OUT_EMPLOYEE').length}</strong>
                <small>Clinical & Field team</small>
              </div>
            </section>

            {loading && (
              <div className="data-loading">
                <RefreshCw size={18} className="spin" />
                Loading accounts and assigned roles...
              </div>
            )}

            {error && (
              <div className="data-error">
                <span>{error}</span>
                <button className="secondary-button" onClick={() => void load()}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && (
              <section className="panel">
                <div className="panel-heading">
                  <div className="panel-title-wrap">
                    <p className="eyebrow">User Directory</p>
                    <h2>System Users & Assigned Permissions</h2>
                  </div>
                  <div className="panel-toolbar">
                    <div className="search-field" style={{ width: '250px', maxWidth: '100%' }}>
                      <Search size={16} />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search accounts & roles..."
                      />
                    </div>
                    <div className="panel-toolbar-actions">
                      <select
                        className="select-control"
                        value={roleFilter}
                        onChange={(event) => setRoleFilter(event.target.value)}
                        style={{ width: 'auto', minWidth: '150px' }}
                      >
                        <option>All roles</option>
                        <option value="SYSTEM_ADMIN">System Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="INHOUSE_STAFF">Inhouse Employee</option>
                        <option value="OUT_EMPLOYEE">Out Employee</option>
                      </select>
                      <span className="result-count">{filtered.length} users</span>
                    </div>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No accounts found</h2>
                    <p>Add team members to configure workspace permissions.</p>
                  </div>
                ) : (
                  <div
                    className="table-wrap custom-scrollbar"
                    style={{
                      maxHeight: 'calc(100vh - 360px)',
                      minHeight: '300px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <table className="rich-table">
                      <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                        <tr>
                          <th style={{ background: '#ffffff' }}>Account</th>
                          <th style={{ background: '#ffffff' }}>Email</th>
                          <th style={{ background: '#ffffff' }}>Role</th>
                          <th style={{ background: '#ffffff' }}>Permissions</th>
                          <th style={{ background: '#ffffff' }}>Status</th>
                          <th style={{ textAlign: 'right', background: '#ffffff' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((userItem) => {
                          const activePermCount = userItem.permissions?.length ?? 0;
                          const roleMeta = ROLE_LABELS[userItem.role] || { label: userItem.role, bg: '#f1f5f9', textColor: '#475569' };
                          const displayName = [userItem.firstName, userItem.lastName].filter(Boolean).join(' ') || 'Admin';
                          const initials = (userItem.lastName && userItem.lastName.trim())
                            ? `${userItem.firstName.slice(0, 1)}${userItem.lastName.slice(0, 1)}`.toUpperCase()
                            : userItem.firstName.slice(0, 1).toUpperCase();

                          return (
                            <tr key={userItem._id}>
                              <td>
                                <div className="entity-cell">
                                  <div className="entity-avatar">
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <strong>
                                        {displayName}
                                      </strong>
                                      {userItem.isProtected && (
                                        <span
                                          style={{
                                            fontSize: '9px',
                                            background: '#e0efeb',
                                            color: '#0f766e',
                                            fontWeight: 700,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                          }}
                                        >
                                          Protected
                                        </span>
                                      )}
                                    </div>
                                    <span>{userItem.title ?? roleMeta.label}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="muted-cell">{userItem.email}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    fontFamily: 'DM Sans, sans-serif',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    background: roleMeta.bg,
                                    color: roleMeta.textColor,
                                    fontWeight: 700,
                                  }}
                                >
                                  {roleMeta.label}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {userItem.role === 'SYSTEM_ADMIN' || userItem.isProtected ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: '#ecfdf5',
                                        color: '#065f46',
                                        fontWeight: 700,
                                        border: '1px solid #a7f3d0',
                                      }}
                                    >
                                      <ShieldCheck size={12} /> All ({PERMISSION_LEVELS.length} levels)
                                    </span>
                                  ) : (
                                    <span className="status status-healthy" style={{ fontSize: '11px' }}>
                                      <KeyRound size={12} /> {activePermCount} of {PERMISSION_LEVELS.length} levels
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {userItem.status === 'SUSPENDED' ? (
                                  <span className="status status-critical" title="Account is suspended">
                                    <i /> Suspended
                                  </span>
                                ) : userItem.isOnline ? (
                                  <span className="status status-online" title="User is currently active in workspace">
                                    <span className="presence-pulse-dot" /> Online
                                  </span>
                                ) : (
                                  <span className="status status-offline" title="User is currently offline">
                                    <span className="presence-static-dot" /> Offline
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  {userItem.isProtected ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        background: '#f8fafc',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        border: '1px solid #e2e8f0',
                                        cursor: 'not-allowed',
                                      }}
                                      title="This primary administrator account is configured in the environment and is protected from modification or deletion."
                                    >
                                      <Lock size={12} /> Protected (Root Admin)
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => handleOpenEditUser(userItem)}
                                        style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit2 size={12} /> Edit Role & Permissions
                                      </button>
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => void handleToggleStatus(userItem._id, userItem.status)}
                                        style={{ fontSize: '11px', padding: '6px 10px' }}
                                      >
                                        {userItem.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                      </button>
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => handleOpenDelete(userItem)}
                                        style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: '#fecaca' }}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        
        {activeTab === 'roles' && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Role Authorization Matrix</p>
                <h2>Role Configurations & Permission Levels</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Configure standard permission levels assigned across System Admin, Manager, Inhouse Employee, and Out Employee.
                </p>
              </div>
            </div>

            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="rich-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px' }}>Permission Level</th>
                    <th>System Admin</th>
                    <th>Manager</th>
                    <th>Inhouse Employee</th>
                    <th>Out Employee</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_LEVELS.map((perm) => (
                    <tr key={perm.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{perm.name}</strong>
                          <small style={{ color: '#64748b', fontSize: '11px' }}>{perm.description}</small>
                        </div>
                      </td>
                      {(['SYSTEM_ADMIN', 'MANAGER', 'INHOUSE_STAFF', 'OUT_EMPLOYEE'] as UserRole[]).map((rKey) => {
                        const isGranted = (roleMatrixDefaults[rKey] ?? []).includes(perm.id);
                        return (
                          <td key={rKey} style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleRoleMatrixPermission(rKey, perm.id)}
                              style={{
                                border: 'none',
                                background: isGranted ? '#e0efeb' : '#f1f5f9',
                                color: isGranted ? '#0f766e' : '#94a3b8',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {isGranted ? <Check size={14} /> : <X size={14} />}
                              {isGranted ? 'Allowed' : 'Denied'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'maintenance' && isDefaultAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {clearSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <CheckCircle2 size={20} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#15803d', fontWeight: 700 }}>
                    Workspace Data Cleared Successfully
                  </h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#166534' }}>
                    {clearSuccess.message}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#15803d' }}>
                    <span>🗑️ Customers deleted: <strong>{clearSuccess.deletedCounts.customers}</strong></span>
                    <span>🗑️ Sensors deleted: <strong>{clearSuccess.deletedCounts.sensors}</strong></span>
                    <span>🗑️ Sensor types: <strong>{clearSuccess.deletedCounts.sensorTypes}</strong></span>
                    <span>🗑️ Reports deleted: <strong>{clearSuccess.deletedCounts.reports}</strong></span>
                    <span>🗑️ Notifications & logs: <strong>{clearSuccess.deletedCounts.notifications + clearSuccess.deletedCounts.auditLogs}</strong></span>
                    <span>🛡️ Preserved user accounts: <strong>{clearSuccess.preserved.users}</strong></span>
                  </div>
                </div>
              </div>
            )}

            <section className="mini-stat-grid" style={{ marginBottom: '4px' }}>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Preserved Users</span>
                  <ShieldCheck size={18} color="#059669" />
                </div>
                <strong style={{ color: '#059669' }}>{systemStats?.users ?? users.length}</strong>
                <small style={{ color: '#059669', fontWeight: 600 }}>🛡️ Protected from wipe</small>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Preserved Staff</span>
                  <UsersIcon size={18} color="#059669" />
                </div>
                <strong style={{ color: '#059669' }}>{systemStats?.employees ?? users.length}</strong>
                <small style={{ color: '#059669', fontWeight: 600 }}>🛡️ Protected from wipe</small>
              </div>
              <div className="mini-stat mini-stat-teal">
                <div className="mini-stat-top">
                  <span>Customers / Patients</span>
                  <UsersIcon size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.customers ?? 0)}</strong>
                <small>Records in database</small>
              </div>
              <div className="mini-stat mini-stat-blue">
                <div className="mini-stat-top">
                  <span>Sensors in Fleet</span>
                  <Database size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.sensors ?? 0)}</strong>
                <small>Active & assigned units</small>
              </div>
            </section>

            <section className="mini-stat-grid" style={{ marginBottom: '8px' }}>
              <div className="mini-stat mini-stat-amber">
                <div className="mini-stat-top">
                  <span>Sensor Specifications</span>
                  <Database size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.sensorTypes ?? 0)}</strong>
                <small>Catalog definitions</small>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Generated Reports</span>
                  <Database size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.reports ?? 0)}</strong>
                <small>PDF / CSV clinical files</small>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Notifications & Alerts</span>
                  <Database size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.notifications ?? 0)}</strong>
                <small>System alert history</small>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-top">
                  <span>Audit Logs</span>
                  <Database size={18} />
                </div>
                <strong>{statsLoading ? '...' : (systemStats?.auditLogs ?? 0)}</strong>
                <small>Compliance activity records</small>
              </div>
            </section>

            <div className="danger-panel">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="danger-tag">
                      <AlertOctagon size={13} /> Danger Zone
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Restricted to Default Administrator: {currentUserEmail || 'admin@localhost.test'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', color: '#991b1b', margin: '0 0 8px 0', fontWeight: 700 }}>
                    Clear All Workspace Data (Keep Users & Staff)
                  </h3>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                    This action will permanently delete all operational healthcare data from your workspace, including:
                    <strong> Customers, Sensors, Sensor Types, Assignments, Replacements, Generated Reports, Notifications, and Audit Logs</strong>.
                    <br />
                    <span style={{ color: '#059669', fontWeight: 600 }}>
                      ✓ All user accounts, employee logins, passwords, and assigned permissions will remain 100% untouched and protected.
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  style={{ padding: '12px 20px', fontSize: '13px' }}
                  onClick={() => {
                    setClearModalOpen(true);
                    setConfirmClearText('');
                    setClearError('');
                    void fetchStats();
                  }}
                >
                  <Trash2 size={16} /> Clear All Workspace Data
                </button>
              </div>
            </div>
          </div>
        )}

        
        {addModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '480px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Add New User Account</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Create a team member account and configure login credentials.
                  </p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setAddFormError('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label>
                      <span>First name <span style={{ color: '#ef4444' }}>*</span></span>
                      <input
                        required
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Last name <span style={{ color: '#ef4444' }}>*</span></span>
                      <input
                        required
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Email address <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Password <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (addFormError) setAddFormError('');
                      }}
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    <span>Confirm password <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (addFormError) setAddFormError('');
                      }}
                      minLength={6}
                      autoComplete="new-password"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                        Passwords do not match.
                      </small>
                    )}
                  </label>
                  <label>
                    <span>Role <span style={{ color: '#ef4444' }}>*</span></span>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                    >
                      <option value="SYSTEM_ADMIN">System Admin (Full system control)</option>
                      <option value="MANAGER">Manager (Operations & fleet management)</option>
                      <option value="INHOUSE_STAFF">Inhouse Employee (Clinical in-house staff)</option>
                      <option value="OUT_EMPLOYEE">Out Employee (Field technician & external operator)</option>
                    </select>
                  </label>
                </div>

                {addFormError && (
                  <div
                    className="form-error"
                    style={{
                      marginTop: '14px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '12px',
                    }}
                  >
                    {addFormError}
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setAddModalOpen(false);
                      setAddFormError('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={submitting}>
                    {submitting ? <RefreshCw size={16} className="spin" /> : 'Create user'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {editModalOpen && editingUser && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '560px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Edit Role & Permission Levels</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    {editingUser.firstName} {editingUser.lastName} ({editingUser.email})
                  </p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveUserRoleAndPermissions}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label>
                    Assign Role
                    <select
                      value={editRole}
                      onChange={(e) => handleRoleChangeInEdit(e.target.value as UserRole)}
                      style={{ width: '100%', marginTop: '4px' }}
                    >
                      <option value="SYSTEM_ADMIN">System Admin (Full system control)</option>
                      <option value="MANAGER">Manager (Operations & fleet management)</option>
                      <option value="INHOUSE_STAFF">Inhouse Employee (Clinical in-house staff)</option>
                      <option value="OUT_EMPLOYEE">Out Employee (Field technician & external operator)</option>
                    </select>
                  </label>

                  <div>
                    <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                      Granular Permission Levels ({editPermissions.length} granted)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                      {PERMISSION_LEVELS.map((perm) => {
                        const checked = editPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: checked ? '#f8fafc' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(perm.id)}
                              style={{ marginTop: '2px' }}
                            />
                            <div>
                              <strong style={{ fontSize: '13px', display: 'block' }}>{perm.name}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{perm.description}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {!editingUser.isProtected ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const target = editingUser;
                        setEditModalOpen(false);
                        setEditingUser(null);
                        handleOpenDelete(target);
                      }}
                      style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} /> Delete user
                    </button>
                  ) : <div />}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" type="submit" disabled={submitting}>
                      {submitting ? <RefreshCw size={16} className="spin" /> : 'Save Role & Permissions'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {deleteTarget && (
          <div className="modal-backdrop" onClick={() => !deleteSubmitting && setDeleteTarget(null)}>
            <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-heading" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0 }}>Delete User Account</h2>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Permanent account removal</p>
                  </div>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => setDeleteTarget(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '16px 0 8px 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 12px 0' }}>
                  Are you sure you want to permanently delete this user account?
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                    {deleteTarget.firstName} {deleteTarget.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {deleteTarget.email}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: ROLE_LABELS[deleteTarget.role]?.bg || '#f1f5f9', color: ROLE_LABELS[deleteTarget.role]?.textColor || '#334155', fontWeight: 600 }}>
                      {ROLE_LABELS[deleteTarget.role]?.label || deleteTarget.role}
                    </span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', padding: '8px 10px' }}>
                  This action cannot be undone. The user will immediately lose system access and their login credentials will be permanently deleted.
                </p>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={deleteSubmitting}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={deleteSubmitting}
                  onClick={() => void handleConfirmDelete()}
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                >
                  {deleteSubmitting ? <RefreshCw size={16} className="spin" /> : <><Trash2 size={14} /> Permanently delete</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {clearModalOpen && isDefaultAdmin && (
          <div className="modal-backdrop" onClick={() => !clearing && setClearModalOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-heading" style={{ borderBottom: '1px solid #fee2e2', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                    <AlertOctagon size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', color: '#991b1b', margin: 0, fontWeight: 700 }}>
                      Confirm Clear All Data
                    </h2>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Permanent workspace wipe • Protected user accounts preserved
                    </p>
                  </div>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  disabled={clearing}
                  onClick={() => setClearModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleClearAllData}>
                <div style={{ padding: '16px 0', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to clear all operational data in this workspace? This action is immediate and irreversible.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={13} /> Wiped Permanently:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#7f1d1d', lineHeight: 1.5 }}>
                        <li>All Customers & Patients</li>
                        <li>All Sensors & Telemetry</li>
                        <li>All Sensor Types</li>
                        <li>All Assignments & Replacements</li>
                        <li>All Reports & PDF Files</li>
                        <li>All Notifications & Alerts</li>
                        <li>All Audit Log Entries</li>
                      </ul>
                    </div>

                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Safely Preserved:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#14532d', lineHeight: 1.5 }}>
                        <li>All User Accounts ({users.length})</li>
                        <li>All Staff & Employee Profiles</li>
                        <li>Root Administrator Login</li>
                        <li>Role & Security Permissions</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                      To confirm, type <strong style={{ color: '#dc2626' }}>CLEAR ALL DATA</strong> below:
                    </label>
                    <input
                      type="text"
                      value={confirmClearText}
                      onChange={(e) => {
                        setConfirmClearText(e.target.value);
                        if (clearError) setClearError('');
                      }}
                      placeholder="Type CLEAR ALL DATA to confirm"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: confirmClearText.trim().toUpperCase() === 'CLEAR ALL DATA' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        color: '#0f172a',
                      }}
                      autoComplete="off"
                      disabled={clearing}
                    />
                  </div>

                  {clearError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', color: '#b91c1c', fontSize: '12px' }}>
                      {clearError}
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={clearing}
                    onClick={() => setClearModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="danger-button"
                    disabled={confirmClearText.trim().toUpperCase() !== 'CLEAR ALL DATA' || clearing}
                    style={{ minWidth: '170px', justifyContent: 'center' }}
                  >
                    {clearing ? (
                      <>
                        <RefreshCw size={15} className="spin" /> Wiping Workspace Data...
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} /> Clear All Data (Keep Users)
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
