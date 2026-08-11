'use client';

import {
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
import { apiFetch } from '../../lib/api';

type UserMember = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  authUserId: string;
  role: 'COMPANY_ADMIN' | 'MANAGER' | 'HEALTHCARE_EMPLOYEE' | 'STAFF' | 'AUDITOR';
  title?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserMember[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'COMPANY_ADMIN' | 'MANAGER' | 'HEALTHCARE_EMPLOYEE' | 'STAFF' | 'AUDITOR'>('MANAGER');
  const [newTitle, setNewTitle] = useState('Clinical Operations');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<UserMember[]>('/employees');
      setUsers(Array.isArray(result) ? result : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load employees from API');
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
        title: newTitle.trim() || 'Staff',
      };
      await apiFetch<UserMember>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
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

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to update employee status');
    }
  };

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, or role"
        />
      </div>
      <select
        className="select-control"
        value={roleFilter}
        onChange={(event) => setRoleFilter(event.target.value)}
      >
        <option>All roles</option>
        <option value="COMPANY_ADMIN">Company Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="HEALTHCARE_EMPLOYEE">Healthcare Staff</option>
        <option value="AUDITOR">Auditor</option>
      </select>
      <span className="result-count">{filtered.length} loaded</span>
    </div>
  );

  const topbarRight = (
    <button className="primary-button" onClick={() => setModalOpen(true)}>
      <Plus size={17} /> Add user
    </button>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">
        <section className="mini-stat-grid">
          <div className="mini-stat">
            <div className="mini-stat-top">
              <span>Total employees</span>
              <UsersIcon size={18} />
            </div>
            <strong>{users.length}</strong>
            <small>From API</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <div className="mini-stat-top">
              <span>Administrators</span>
              <ShieldCheck size={18} />
            </div>
            <strong>{users.filter((u) => u.role === 'COMPANY_ADMIN').length}</strong>
            <small>Full access</small>
          </div>
          <div className="mini-stat mini-stat-blue">
            <div className="mini-stat-top">
              <span>Managers</span>
              <UserCheck size={18} />
            </div>
            <strong>{users.filter((u) => u.role === 'MANAGER').length}</strong>
            <small>Operations</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top">
              <span>Invited / Suspended</span>
              <UserPlus size={18} />
            </div>
            <strong>{users.filter((u) => u.status !== 'ACTIVE').length}</strong>
            <small>Pending / Inactive</small>
          </div>
        </section>

        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading employees from API...
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
                <h2>Workspace Team Members</h2>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No employee records found</h2>
                <p>Add the first team member to populate this workspace.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((userItem) => (
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
                              <span>
                                {userItem.createdAt
                                  ? `Added ${new Date(userItem.createdAt).toLocaleDateString()}`
                                  : 'Active account'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="muted-cell">{userItem.email}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '10px',
                              fontFamily: 'DM Mono, monospace',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background:
                                userItem.role === 'COMPANY_ADMIN'
                                  ? '#e0efeb'
                                  : userItem.role === 'MANAGER'
                                  ? '#e0e9fa'
                                  : '#f4f7f7',
                              color:
                                userItem.role === 'COMPANY_ADMIN'
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
                        <td>{userItem.title ?? 'Staff'}</td>
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
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => void handleToggleStatus(userItem._id, userItem.status)}
                            style={{ fontSize: '11px', padding: '6px 10px' }}
                          >
                            {userItem.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Modal: Add User */}
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-heading">
                <h2>Add Team Member</h2>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                      onChange={(e) =>
                        setNewRole(
                          e.target.value as 'COMPANY_ADMIN' | 'MANAGER' | 'HEALTHCARE_EMPLOYEE' | 'STAFF' | 'AUDITOR'
                        )
                      }
                    >
                      <option value="COMPANY_ADMIN">Company Admin (Full permissions)</option>
                      <option value="MANAGER">Manager (Sensor & customer manager)</option>
                      <option value="HEALTHCARE_EMPLOYEE">Healthcare Employee (Clinical staff)</option>
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
                    onClick={() => setModalOpen(false)}
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
      </div>
    </AppShell>
  );
}
