'use client';

import {
  AlertTriangle,
  Check,
  Edit2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch, getSession } from '../../lib/api';

export type UserRole = 'SYSTEM_ADMIN' | 'MANAGER' | 'INHOUSE_STAFF' | 'OUT_EMPLOYEE';

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
  createdAt?: string;
};

export const PERMISSION_LEVELS: { id: string; name: string; category: string; description: string }[] = [
  { id: 'users.manage', name: 'User Management', category: 'Administration', description: 'Create, update, suspend, and configure user accounts' },
  { id: 'roles.manage', name: 'Role & Permission Config', category: 'Administration', description: 'Modify workspace roles and permission levels' },
  { id: 'dashboard.view', name: 'View Dashboard', category: 'Analytics', description: 'Access real-time operational health telemetry' },
  { id: 'dashboard.edit', name: 'Customize Dashboard', category: 'Analytics', description: 'Modify dashboard widgets and alert thresholds' },
  { id: 'sensors.view', name: 'View Sensors', category: 'Sensors', description: 'Monitor live sensor readings and hardware status' },
  { id: 'sensors.manage', name: 'Manage Sensors', category: 'Sensors', description: 'Provision, calibrate, and command sensor devices' },
  { id: 'customers.view', name: 'View Customers', category: 'Customers', description: 'View customer accounts and patient assignment records' },
  { id: 'customers.manage', name: 'Manage Customers', category: 'Customers', description: 'Add, update, and manage customer accounts' },
  { id: 'audit.view', name: 'Security Audit Logs', category: 'Compliance', description: 'View system access and security compliance logs' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SYSTEM_ADMIN: PERMISSION_LEVELS.map((p) => p.id),
  MANAGER: ['users.manage', 'dashboard.view', 'dashboard.edit', 'sensors.view', 'sensors.manage', 'customers.view', 'customers.manage'],
  INHOUSE_STAFF: ['dashboard.view', 'sensors.view', 'sensors.manage', 'customers.view'],
  OUT_EMPLOYEE: ['dashboard.view', 'sensors.view', 'customers.view'],
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<UserMember[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('ChangeMe123!');
  const [newRole, setNewRole] = useState<UserRole>('INHOUSE_STAFF');
  const [newTitle, setNewTitle] = useState('Inhouse Clinical Operations');

  // Edit Role & Permissions Form State
  const [editRole, setEditRole] = useState<UserRole>('INHOUSE_STAFF');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<UserMember | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Role Matrix Custom Defaults State
  const [roleMatrixDefaults, setRoleMatrixDefaults] = useState<Record<UserRole, string[]>>(DEFAULT_ROLE_PERMISSIONS);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await getSession();
      const currentUser = sessionData?.session?.user;

      const apiEmployees = await apiFetch<UserMember[]>('/employees').catch(() => []);
      let combinedList: UserMember[] = Array.isArray(apiEmployees) ? [...apiEmployees] : [];

      if (currentUser?.email) {
        const exists = combinedList.some(
          (u) => u.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        if (!exists) {
          const emailName = currentUser.email.split('@')[0] ?? 'admin';
          const userRole = (currentUser.role as UserRole) || 'SYSTEM_ADMIN';
          const authUser: UserMember = {
            _id: currentUser.id,
            firstName: emailName,
            lastName: 'Admin',
            email: currentUser.email,
            authUserId: currentUser.id,
            role: userRole,
            permissions: DEFAULT_ROLE_PERMISSIONS[userRole] ?? DEFAULT_ROLE_PERMISSIONS.SYSTEM_ADMIN,
            title: 'Primary Administrator',
            status: 'ACTIVE',
            isProtected: true,
            createdAt: new Date().toISOString().split('T')[0] ?? '',
          };
          combinedList = [authUser, ...combinedList];
        }
      }

      const enrichedUsers = combinedList.map((u) => ({
        ...u,
        isProtected: Boolean(
          u.isProtected ||
          (currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase() && u.role === 'SYSTEM_ADMIN') ||
          (u.email.toLowerCase() === 'admin@localhost.test' && u.role === 'SYSTEM_ADMIN')
        ),
        permissions: u.permissions && u.permissions.length > 0 ? u.permissions : DEFAULT_ROLE_PERMISSIONS[u.role] ?? DEFAULT_ROLE_PERMISSIONS.INHOUSE_STAFF,
      }));

      setUsers(enrichedUsers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load accounts and permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
    if (!newFirstName || !newLastName || !newEmail) return;

    setSubmitting(true);
    try {
      const payload = {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email: newEmail.trim().toLowerCase(),
        authUserId: `user_${Date.now()}`,
        role: newRole,
        status: 'ACTIVE',
        password: newPassword.trim() || 'ChangeMe123!',
        permissions: roleMatrixDefaults[newRole] ?? DEFAULT_ROLE_PERMISSIONS[newRole],
        title: newTitle.trim() || ROLE_LABELS[newRole].label,
      };
      await apiFetch<UserMember>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAddModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('ChangeMe123!');
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to create user account');
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

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search accounts & roles..."
        />
      </div>
      <select
        className="select-control"
        value={roleFilter}
        onChange={(event) => setRoleFilter(event.target.value)}
      >
        <option>All roles</option>
        <option value="SYSTEM_ADMIN">System Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="INHOUSE_STAFF">Inhouse Employee</option>
        <option value="OUT_EMPLOYEE">Out Employee</option>
      </select>
      <span className="result-count">{filtered.length} users</span>
    </div>
  );

  const topbarRight = (
    <button className="primary-button" onClick={() => setAddModalOpen(true)}>
      <Plus size={17} /> Add user
    </button>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
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
        </div>

        {activeTab === 'users' && (
          <>
            <section className="mini-stat-grid">
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
                  <span>System Admins</span>
                  <ShieldCheck size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'SYSTEM_ADMIN').length}</strong>
                <small>Full platform control</small>
              </div>
              <div className="mini-stat mini-stat-blue">
                <div className="mini-stat-top">
                  <span>Managers</span>
                  <UserCheck size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'MANAGER').length}</strong>
                <small>Operations management</small>
              </div>
              <div className="mini-stat mini-stat-amber">
                <div className="mini-stat-top">
                  <span>Inhouse & Out Staff</span>
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
                  <div>
                    <p className="eyebrow">User Directory</p>
                    <h2>System Users & Assigned Permissions</h2>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No accounts found</h2>
                    <p>Add team members to configure workspace permissions.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="rich-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Permissions</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((userItem) => {
                          const activePermCount = userItem.permissions?.length ?? 0;
                          const roleMeta = ROLE_LABELS[userItem.role] || { label: userItem.role, bg: '#f1f5f9', textColor: '#475569' };
                          return (
                            <tr key={userItem._id}>
                              <td>
                                <div className="entity-cell">
                                  <div className="entity-avatar">
                                    {userItem.firstName.slice(0, 1).toUpperCase()}
                                    {userItem.lastName.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <strong>
                                        {userItem.firstName} {userItem.lastName}
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
                                  <span className="status status-healthy" style={{ fontSize: '11px' }}>
                                    <KeyRound size={12} /> {activePermCount} level{activePermCount === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`status ${
                                    userItem.status === 'ACTIVE'
                                      ? 'status-healthy'
                                      : userItem.status === 'INVITED'
                                      ? 'status-warning'
                                      : 'status-critical'
                                  }`}
                                >
                                  <i />
                                  {userItem.status}
                                </span>
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

        {/* Roles & Permissions Matrix Tab */}
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

        {/* Modal: Add User */}
        {addModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-heading">
                <h2>Add Team Member</h2>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label>
                      <span>First name</span>
                      <input
                        required
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        placeholder="First name"
                      />
                    </label>
                    <label>
                      <span>Last name</span>
                      <input
                        required
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        placeholder="Last name"
                      />
                    </label>
                  </div>
                  <label>
                    <span>Email address</span>
                    <input
                      required
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email address"
                    />
                  </label>
                  <label>
                    <span>Temporary Login Password</span>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter password (minimum 6 characters)"
                      minLength={6}
                    />
                    <small style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                      Account is activated immediately with this login password.
                    </small>
                  </label>
                  <label>
                    <span>Role</span>
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
                  <label>
                    <span>Title / Department</span>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Job title or department"
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setAddModalOpen(false)}
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

        {/* Modal: Edit User Role & Permission Levels */}
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

        {/* Modal: Delete User Confirmation */}
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
      </div>
    </AppShell>
  );
}
