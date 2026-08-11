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
  role: 'COMPANY_ADMIN' | 'MANAGER' | 'NURSE' | 'AUDITOR';
  department: string;
  status: 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserMember[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New User Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'COMPANY_ADMIN' | 'MANAGER' | 'NURSE' | 'AUDITOR'>('MANAGER');
  const [newDepartment, setNewDepartment] = useState('Clinical Operations');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch employees from API or initialize with workspace team
      const result = await apiFetch<UserMember[]>('/employees').catch(() => []);
      if (result && result.length > 0) {
        setUsers(result);
      } else {
        // Initial fallback workspace team list
        setUsers([
          {
            _id: 'usr-1',
            firstName: 'Sarah',
            lastName: 'Jenkins',
            email: 'sarah.jenkins@caresignal.health',
            role: 'COMPANY_ADMIN',
            department: 'Executive',
            status: 'ACTIVE',
            createdAt: '2026-01-10',
          },
          {
            _id: 'usr-2',
            firstName: 'Dr. Marcus',
            lastName: 'Vance',
            email: 'marcus.vance@caresignal.health',
            role: 'MANAGER',
            department: 'Clinical Operations',
            status: 'ACTIVE',
            createdAt: '2026-01-15',
          },
          {
            _id: 'usr-3',
            firstName: 'Elena',
            lastName: 'Rostova',
            email: 'elena.rostova@caresignal.health',
            role: 'NURSE',
            department: 'Patient Monitoring',
            status: 'ACTIVE',
            createdAt: '2026-02-01',
          },
          {
            _id: 'usr-4',
            firstName: 'David',
            lastName: 'Chen',
            email: 'david.chen@caresignal.health',
            role: 'AUDITOR',
            department: 'Quality & Compliance',
            status: 'ACTIVE',
            createdAt: '2026-02-05',
          },
        ]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load user team');
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
          `${u.firstName} ${u.lastName} ${u.email} ${u.department} ${u.role}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [users, query, roleFilter]
  );

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newFirstName || !newEmail) return;

    const newUser: UserMember = {
      _id: `usr-${Date.now()}`,
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      role: newRole,
      department: newDepartment || 'Operations',
      status: 'INVITED',
      createdAt: new Date().toISOString().split('T')[0] ?? '',
    };

    try {
      await apiFetch('/employees', {
        method: 'POST',
        body: JSON.stringify(newUser),
      }).catch(() => null);
    } finally {
      setUsers([newUser, ...users]);
      setModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
    }
  };

  const handleToggleStatus = (id: string) => {
    setUsers(
      users.map((u) =>
        u._id === id
          ? { ...u, status: u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' }
          : u
      )
    );
  };

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, or department"
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
        <option value="NURSE">Nurse</option>
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
              <span>Total members</span>
              <UsersIcon size={18} />
            </div>
            <strong>{users.length}</strong>
            <small>Active workspace</small>
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
            <small>Team leads</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top">
              <span>Pending invites</span>
              <UserPlus size={18} />
            </div>
            <strong>{users.filter((u) => u.status === 'INVITED').length}</strong>
            <small>Awaiting login</small>
          </div>
        </section>

        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading workspace members...
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
                <h2>No team members found</h2>
                <p>Add a new user to invite them to this company workspace.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
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
                              {userItem.firstName.slice(0, 1)}
                              {userItem.lastName.slice(0, 1)}
                            </div>
                            <div>
                              <strong>
                                {userItem.firstName} {userItem.lastName}
                              </strong>
                              <span>Joined {userItem.createdAt}</span>
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
                        <td>{userItem.department}</td>
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
                            onClick={() => handleToggleStatus(userItem._id)}
                            style={{ fontSize: '11px', padding: '6px 10px' }}
                          >
                            {userItem.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
                <h2>Invite New Team Member</h2>
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
                          e.target.value as 'COMPANY_ADMIN' | 'MANAGER' | 'NURSE' | 'AUDITOR'
                        )
                      }
                    >
                      <option value="COMPANY_ADMIN">Company Admin (Full permissions)</option>
                      <option value="MANAGER">Manager (Sensor & customer manager)</option>
                      <option value="NURSE">Nurse (Clinical viewer)</option>
                      <option value="AUDITOR">Auditor (Read-only compliance)</option>
                    </select>
                  </label>
                  <label>
                    Department
                    <input
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
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
                  <button className="primary-button" type="submit">
                    Send invitation
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
