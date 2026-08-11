'use client';

import { ClipboardList, Download, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';

type AuditEvent = { _id: string; actorUserId: string; action: string; entityType: string; entityId?: string; createdAt?: string };

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiFetch<AuditEvent[]>('/audit')
      .then(setEvents)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load audit history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      events.filter((event) =>
        `${event.actorUserId} ${event.action} ${event.entityType} ${event.entityId ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [events, query]
  );

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search actor, action, or entity"
        />
      </div>
      <span className="result-count">{filtered.length} loaded</span>
    </div>
  );

  const topbarRight = (
    <button className="secondary-button">
      <Download size={16} /> Export log
    </button>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">
        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading audit history...
          </div>
        )}

        {error && (
          <div className="data-error">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <section className="panel">
            <div className="audit-intro">
              <ClipboardList size={19} />
              <span>Showing live immutable activity from the API.</span>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No audit events</h2>
                <p>Activity will appear here after authenticated changes are recorded.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((event) => (
                      <tr key={event._id}>
                        <td>
                          <strong>{event.actorUserId}</strong>
                        </td>
                        <td>
                          <span className="audit-action">{event.action}</span>
                        </td>
                        <td>
                          {event.entityType} {event.entityId ?? ''}
                        </td>
                        <td className="muted-cell">
                          {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Unknown'}
                        </td>
                      </tr>
                    ))}
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
