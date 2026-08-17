'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Tag,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type DashboardSummary = {
  totalCustomers: number;
  activeCustomers: number;
  totalSensors: number;
  activeSensors: number;
  expiringSensors: number;
  expiredSensors: number;
  unreadNotifications: number;
};

type Sensor = {
  _id: string;
  serialNumber: string;
  sensorTypeId: string;
  sensorTypeName?: string;
  sensorTypeCode?: string;
  manufacturer: string;
  model: string;
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  status: string;
  activatedAt?: string;
  installedAt?: string;
  expiresAt: string;
};

type SensorResponse = {
  data: Sensor[];
  total: number;
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getDaysRemaining(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getStatusBadge(status: string, daysLeft: number) {
  if (status === 'EXPIRED' || daysLeft < 0) {
    return { className: 'status status-critical', label: 'EXPIRED' };
  }
  if (status === 'EXPIRING_SOON' || (daysLeft >= 0 && daysLeft <= 30)) {
    return { className: 'status status-warning', label: 'EXPIRING SOON' };
  }
  if (status === 'ACTIVE' || status === 'ASSIGNED') {
    return { className: 'status status-healthy', label: status };
  }
  return { className: 'status status-neutral', label: status };
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [allSensors, setAllSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSummary, nextSensors] = await Promise.all([
        apiFetch<DashboardSummary>('/dashboard/summary'),
        apiFetch<SensorResponse>('/sensors?limit=50'),
      ]);
      setSummary(nextSummary);
      setAllSensors(nextSensors.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => void load()).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  
  const expiringSensors = useMemo(() => {
    return allSensors
      .filter((s) => {
        const days = getDaysRemaining(s.expiresAt);
        return s.status === 'EXPIRING_SOON' || s.status === 'EXPIRED' || days <= 30;
      })
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }, [allSensors]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="data-loading">
          <RefreshCw size={18} className="spin" /> Loading live workspace telemetry...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="data-error">
          <CircleAlert size={20} />
          <div>
            <strong>Dashboard data unavailable</strong>
            <span>{error}</span>
          </div>
          <button className="secondary-button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const metrics = [
    {
      label: 'Active customers',
      value: summary.activeCustomers,
      delta: `${summary.totalCustomers} total`,
      note: 'From customer directory',
      tone: 'teal',
    },
    {
      label: 'Sensors in service',
      value: summary.activeSensors,
      delta: `${summary.totalSensors} total registered`,
      note: 'Active telemetry devices',
      tone: 'blue',
    },
    {
      label: 'Expiring in 30 days',
      value: summary.expiringSensors,
      delta: `${summary.expiredSensors} already expired`,
      note: 'Requires clinical action',
      tone: 'amber',
    },
  ];

  return (
    <div className="page-content">
      {/* Top 3 KPI metric summary cards */}
      <section className="metric-grid" aria-label="Workspace summary">
        {metrics.map((metric) => (
          <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
            <div className="metric-top">
              <span>{metric.label}</span>
              <MoreHorizontal size={17} />
            </div>
            <strong>{metric.value.toLocaleString()}</strong>
            <div className="metric-bottom">
              <b>{metric.delta}</b>
              <span>{metric.note}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Main Expiring Sensors Data Table */}
      <section className="panel" style={{ padding: '20px 22px', marginBottom: '24px' }}>
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="eyebrow" style={{ color: '#d97706', fontWeight: 700 }}>
                Attention Required
              </p>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Sensors About to Expire</h2>
            </div>
          </div>
          <Link className="ghost-button" href="/sensors">
            Manage Replacements <ArrowRight size={14} />
          </Link>
        </div>

        {expiringSensors.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '6px 0 0 0' }}>
              All Active Sensors are Healthy
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '440px' }}>
              No sensors in service are expiring within the next 30 days. Operating telemetry devices are within standard lifecycles.
            </p>
          </div>
        ) : (
          <div
            className="table-wrap custom-scrollbar"
            style={{
              overflowX: 'auto',
              border: '1px solid #edf1f1',
              borderRadius: '6px',
              width: '100%',
            }}
          >
            <table className="rich-table" style={{ width: '100%', minWidth: '600px', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                <tr>
                  <th style={{ background: '#ffffff', padding: '12px' }}>Serial Number</th>
                  <th style={{ background: '#ffffff', padding: '12px' }}>Sensor Type</th>
                  <th style={{ background: '#ffffff', padding: '12px' }}>Assigned Customer</th>
                  <th style={{ background: '#ffffff', padding: '12px' }}>Expiration Date</th>
                  <th style={{ background: '#ffffff', padding: '12px' }}>Status</th>
                  <th style={{ background: '#ffffff', textAlign: 'right', padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringSensors.map((sensor) => {
                  const days = getDaysRemaining(sensor.expiresAt);
                  const isPast = days < 0;
                  const badge = getStatusBadge(sensor.status, days);

                  return (
                    <tr key={sensor._id}>
                      <td style={{ padding: '16px 12px 16px 0' }}>
                        <strong className="serial" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {sensor.serialNumber}
                        </strong>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Tag size={12} style={{ color: '#0f766e' }} />
                          {sensor.sensorTypeName || sensor.sensorTypeCode || sensor.sensorTypeId}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        {sensor.customerName ? (
                          sensor.customerId ? (
                            <Link
                              href={`/customers/${sensor.customerId}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textDecoration: 'none',
                                color: '#0f766e',
                                fontWeight: 600,
                              }}
                              title={`View ${sensor.customerName}'s profile`}
                            >
                              <User size={13} style={{ color: '#0f766e' }} />
                              <strong
                                style={{
                                  color: '#0f766e',
                                  textDecoration: 'underline',
                                  textDecorationColor: 'rgba(15, 118, 110, 0.35)',
                                  textUnderlineOffset: '3px',
                                }}
                              >
                                {sensor.customerName}
                              </strong>
                              {sensor.customerNumber && (
                                <span style={{ fontSize: '11px', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
                                  ({sensor.customerNumber})
                                </span>
                              )}
                            </Link>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={13} style={{ color: '#64748b' }} />
                              <div>
                                <strong>{sensor.customerName}</strong>
                                {sensor.customerNumber && (
                                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
                                    ({sensor.customerNumber})
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 500 }}>{formatDate(sensor.expiresAt)}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isPast ? '#fee2e2' : '#fef3c7',
                              color: isPast ? '#ef4444' : '#b45309',
                            }}
                          >
                            {isPast ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span className={badge.className}>
                          <i />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 0 16px 12px' }}>
                        <Link
                          href="/sensors"
                          className="secondary-button"
                          style={{
                            fontSize: '11px',
                            padding: '6px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Replace <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
