'use client';

import {
  Check,
  Edit2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch, getSession } from '../../lib/api';

type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'HEALTHCARE_EMPLOYEE' | 'STAFF' | 'AUDITOR';

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
  SUPER_ADMIN: PERMISSION_LEVELS.map((p) => p.id),
  COMPANY_ADMIN: PERMISSION_LEVELS.map((p) => p.id),
  MANAGER: ['users.manage', 'dashboard.view', 'dashboard.edit', 'sensors.view', 'sensors.manage', 'customers.view', 'customers.manage'],
  HEALTHCARE_EMPLOYEE: ['dashboard.view', 'sensors.view', 'sensors.manage', 'customers.view'],
  STAFF: ['dashboard.view', 'sensors.view', 'customers.view'],
  AUDITOR: ['dashboard.view', 'sensors.view', 'audit.view'],
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
  const [newRole, setNewRole] = useState<UserRole>('MANAGER');
  const [newTitle, setNewTitle] = useState('Clinical Operations');

  // Edit Role & Permissions Form State
  const [editRole, setEditRole] = useState<UserRole>('MANAGER');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

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
          const authUser: UserMember = {
            _id: currentUser.id,
            firstName: emailName,
            lastName: 'Admin',
            email: currentUser.email,
            authUserId: currentUser.id,
            role: (currentUser.role as UserRole) ?? 'COMPANY_ADMIN',
            permissions: DEFAULT_ROLE_PERMISSIONS[(currentUser.role as UserRole) ?? 'COMPANY_ADMIN'],
            title: 'Authenticated Admin',
            status: 'ACTIVE',
            createdAt: new Date().toISOString().split('T')[0] ?? '',
          };
          combinedList = [authUser, ...combinedList];
        }
      }

      // Ensure every user has valid permissions populated
      const enrichedUsers = combinedList.map((u) => ({
        ...u,
        permissions: u.permissions && u.permissions.length > 0 ? u.permissions : DEFAULT_ROLE_PERMISSIONS[u.role] ?? DEFAULT_ROLE_PERMISSIONS.STAFF,
      }));

      setUsers(enrichedUsers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load users and role configurations');
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
          `${u.firstName} ${u.lastName} ${u.email} ${u.title ?? ''} ${u.role}`
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
        permissions: roleMatrixDefaults[newRole] ?? DEFAULT_ROLE_PERMISSIONS[newRole],
        title: newTitle.trim() || 'Staff',
      };
      await apiFetch<UserMember>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAddModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to create user record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (userItem: UserMember) => {
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

    setSubmitting(true);
    try {
      await apiFetch(`/employees/${editingUser._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole, permissions: editPermissions }),
      }).catch(() => {
        // Fallback update in state if employee record is synthetic session user
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
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch {
      setUsers(users.map((u) => (u._id === id ? { ...u, status: nextStatus } : u)));
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
          placeholder="Search accounts & permissions..."
        />
      </div>
      <select
        className="select-control"
        value={roleFilter}
        onChange={(event) => setRoleFilter(event.target.value)}
      >
        <option>All roles</option>
        <option value="SUPER_ADMIN">Super Admin</option>
        <option value="COMPANY_ADMIN">Company Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="HEALTHCARE_EMPLOYEE">Healthcare Staff</option>
        <option value="STAFF">Staff</option>
        <option value="AUDITOR">Auditor</option>
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
            <ShieldCheck size={16} /> Role & Permission Levels Matrix
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
                <small>Workspace users</small>
              </div>
              <div className="mini-stat mini-stat-teal">
                <div className="mini-stat-top">
                  <span>Administrators</span>
                  <ShieldCheck size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'COMPANY_ADMIN' || u.role === 'SUPER_ADMIN').length}</strong>
                <small>Full system access</small>
              </div>
              <div className="mini-stat mini-stat-blue">
                <div className="mini-stat-top">
                  <span>Managers</span>
                  <UserCheck size={18} />
                </div>
                <strong>{users.filter((u) => u.role === 'MANAGER').length}</strong>
                <small>Operational managers</small>
              </div>
              <div className="mini-stat mini-stat-amber">
                <div className="mini-stat-top">
                  <span>Pending / Suspended</span>
                  <UserPlus size={18} />
                </div>
                <strong>{users.filter((u) => u.status !== 'ACTIVE').length}</strong>
                <small>Account status</small>
              </div>
            </section>

            {loading && (
              <div className="data-loading">
                <RefreshCw size={18} className="spin" />
                Loading users and role permissions...
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
                    <h2>User Accounts & Assigned Permissions</h2>
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
                          <th>Assigned Permissions</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((userItem) => {
                          const activePermCount = userItem.permissions?.length ?? 0;
                          return (
                            <tr key={userItem._id}>
                              <td>
                                <div className="entity-cell">
                                  <div className="entity-avatar">
                                    {userItem.firstName.slice(0, 1).toUpperCase()}
                                    {userItem.lastName.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong>
                                      {userItem.firstName} {userItem.lastName}
                                    </strong>
                                    <span>{userItem.title ?? 'Staff Member'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="muted-cell">{userItem.email}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    fontFamily: 'DM Mono, monospace',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background:
                                      userItem.role === 'SUPER_ADMIN' || userItem.role === 'COMPANY_ADMIN'
                                        ? '#e0efeb'
                                        : userItem.role === 'MANAGER'
                                        ? '#e0e9fa'
                                        : '#f4f7f7',
                                    color:
                                      userItem.role === 'SUPER_ADMIN' || userItem.role === 'COMPANY_ADMIN'
                                        ? '#32776d'
                                        : userItem.role === 'MANAGER'
                                        ? '#3d5c99'
                                        : '#5b6b6e',
                                    fontWeight: 600,
                                  }}
                                >
                                  {userItem.role}
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
                <h2>Permission Levels & Role Controls</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Configure standard permission levels assigned to workspace roles across features.
                </p>
              </div>
            </div>

            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="rich-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px' }}>Permission Level</th>
                    <th>Super Admin</th>
                    <th>Company Admin</th>
                    <th>Manager</th>
                    <th>Healthcare Employee</th>
                    <th>Staff</th>
                    <th>Auditor</th>
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
                      {(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HEALTHCARE_EMPLOYEE', 'STAFF', 'AUDITOR'] as UserRole[]).map((rKey) => {
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
                  <label>
                    First name
                    <input
                      required
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Sarah"
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      required
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Connor"
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="sarah@company.com"
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                    >
                      <option value="SUPER_ADMIN">Super Admin (Full platform permissions)</option>
                      <option value="COMPANY_ADMIN">Company Admin (Full workspace permissions)</option>
                      <option value="MANAGER">Manager (Sensors & customer management)</option>
                      <option value="HEALTHCARE_EMPLOYEE">Healthcare Employee (Clinical staff)</option>
                      <option value="STAFF">Staff (Standard view access)</option>
                      <option value="AUDITOR">Auditor (Read-only compliance)</option>
                    </select>
                  </label>
                  <label>
                    Title / Department
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Clinical Operations"
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
                      <option value="SUPER_ADMIN">Super Admin (All permissions)</option>
                      <option value="COMPANY_ADMIN">Company Admin (Full permissions)</option>
                      <option value="MANAGER">Manager (Sensors, customers, operations)</option>
                      <option value="HEALTHCARE_EMPLOYEE">Healthcare Employee (Clinical staff)</option>
                      <option value="STAFF">Staff (Standard access)</option>
                      <option value="AUDITOR">Auditor (Compliance audit)</option>
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

                <div className="modal-actions" style={{ marginTop: '20px' }}>
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
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
