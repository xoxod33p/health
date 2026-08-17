'use client';

import { Activity, ClipboardList, Download, RefreshCw, Search, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type AuditEvent = {
  _id: string;
  actorUserId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  actorTitle?: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt?: string;
};

function getRoleBadge(role?: string) {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return { label: 'Admin', bg: '#fee2e2', color: '#991b1b' };
    case 'MANAGER':
      return { label: 'Manager', bg: '#fef3c7', color: '#92400e' };
    case 'INHOUSE_STAFF':
      return { label: 'Staff', bg: '#e0f2fe', color: '#0369a1' };
    case 'OUT_EMPLOYEE':
      return { label: 'Field Staff', bg: '#f1f5f9', color: '#475569' };
    default:
      return { label: role || 'User', bg: '#f1f5f9', color: '#475569' };
  }
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = () => {
    setLoading(true);
    setError('');
    apiFetch<AuditEvent[]>('/audit')
      .then(setEvents)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load audit history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => {
      loadLogs();
    }).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  const filtered = useMemo(
    () =>
      events.filter((event) =>
        `${event.actorName ?? ''} ${event.actorEmail ?? ''} ${event.actorUserId} ${event.action} ${event.entityType} ${event.entityId ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [events, query]
  );

  const handleExportCsv = () => {
    if (events.length === 0) return;
    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Actor Role', 'Action', 'Entity Type', 'Entity ID'];
    const rows = events.map((e) => [
      e.createdAt ? new Date(e.createdAt).toISOString() : '',
      `"${(e.actorName || e.actorUserId).replace(/"/g, '""')}"`,
      `"${(e.actorEmail || '').replace(/"/g, '""')}"`,
      `"${(e.actorRole || '').replace(/"/g, '""')}"`,
      `"${e.action.replace(/"/g, '""')}"`,
      `"${e.entityType.replace(/"/g, '""')}"`,
      `"${(e.entityId || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow">Compliance & Traceability</p>
            <h1 className="page-title-text">System Audit Log</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="search-field" style={{ width: '280px', maxWidth: '100%' }}>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by user name, email, action..."
              />
            </div>
            <span className="result-count">{filtered.length} entries</span>
            <button className="secondary-button" type="button" onClick={loadLogs}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button className="secondary-button" type="button" onClick={handleExportCsv} disabled={events.length === 0}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading audit activity...
          </div>
        )}

        {error && (
          <div className="data-error">
            <span>{error}</span>
            <button className="secondary-button" type="button" onClick={loadLogs}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section className="panel">
            <div className="audit-intro" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={18} style={{ color: '#0f766e' }} />
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Immutable system audit trail tracking all clinical and operational changes across the workspace.
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-panel">
                <ClipboardList size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                <h2>No audit events match your search</h2>
                <p>Try clearing filters or search criteria.</p>
              </div>
            ) : (
              <div
                className="table-wrap custom-scrollbar"
                style={{
                  maxHeight: 'calc(100vh - 300px)',
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
                      <th style={{ background: '#ffffff' }}>User / Actor</th>
                      <th style={{ background: '#ffffff' }}>Action</th>
                      <th style={{ background: '#ffffff' }}>Target Entity</th>
                      <th style={{ background: '#ffffff' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((event) => {
                      const role = getRoleBadge(event.actorRole);
                      const displayName = event.actorName || event.actorEmail?.split('@')[0] || event.actorUserId;

                      return (
                        <tr key={event._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: '#e0f2fe',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  flexShrink: 0,
                                }}
                              >
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{displayName}</strong>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: role.bg,
                                      color: role.color,
                                    }}
                                  >
                                    {role.label}
                                  </span>
                                </div>
                                {event.actorEmail && (
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {event.actorEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                              }}
                            >
                              <Activity size={12} style={{ color: '#0f766e' }} />
                              {event.action}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '12px' }}>
                                {event.entityType}
                              </span>
                              {event.entityId && (
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                  ({event.entityId})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="muted-cell" style={{ fontSize: '12px' }}>
                            {event.createdAt
                              ? new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }).format(new Date(event.createdAt))
                              : 'Unknown'}
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
      </div>
    </AppShell>
  );
}
