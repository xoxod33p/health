'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Clock,
  History,
  Info,
  Plus,
  RefreshCw,
  Search,
  Tag,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type Sensor = {
  _id: string;
  serialNumber: string;
  sensorTypeId: string;
  sensorTypeName?: string;
  sensorTypeCode?: string;
  manufacturer?: string;
  model?: string;
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  status: string;
  activatedAt?: string;
  installedAt?: string;
  expiresAt: string;
};
type SensorResponse = { data: Sensor[]; total: number };

type Customer = {
  _id: string;
  firstName: string;
  lastName: string;
  customerNumber: string;
  email?: string;
  phone?: string;
  status?: string;
};
type CustomerResponse = { data: Customer[]; total: number };

type SensorReplacement = {
  _id: string;
  customerName: string;
  serialNumber: string;
  replacedDate: string;
  issueType: string;
  notes?: string;
  createdAt?: string;
};
type ReplacementResponse = { data: SensorReplacement[]; total: number };

type AssignmentRecord = {
  _id: string;
  sensorId: string;
  customerId: string;
  assignedBy?: string;
  assignedAt: string;
  unassignedAt?: string;
  reason?: string;
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
  if (!value) return 999;
  return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getSensorEffectiveStatus(sensor: Sensor) {
  const days = getDaysRemaining(sensor.expiresAt);
  const isPast = days < 0;

  if (sensor.status === 'EXPIRED' || isPast) {
    return {
      key: 'EXPIRED',
      label: 'EXPIRED',
      className: 'status status-critical',
      badgeTone: 'critical',
      daysLeft: days,
      daysLabel: isPast ? `Expired ${Math.abs(days)}d ago` : 'Expired',
    };
  }

  if (sensor.status === 'EXPIRING_SOON' || (days >= 0 && days <= 30 && Boolean(sensor.customerId))) {
    return {
      key: 'EXPIRING_SOON',
      label: 'EXPIRING SOON',
      className: 'status status-warning',
      badgeTone: 'warning',
      daysLeft: days,
      daysLabel: `${days}d left`,
    };
  }

  if (sensor.status === 'DISABLED' || sensor.status === 'REPLACED') {
    return {
      key: sensor.status,
      label: sensor.status,
      className: 'status status-critical',
      badgeTone: 'critical',
      daysLeft: days,
      daysLabel: `${days}d left`,
    };
  }

  if (sensor.customerId || sensor.status === 'ACTIVE' || sensor.status === 'ASSIGNED') {
    return {
      key: 'ACTIVE',
      label: 'ACTIVE',
      className: 'status status-healthy',
      badgeTone: 'healthy',
      daysLeft: days,
      daysLabel: `${days}d left`,
    };
  }

  return {
    key: 'AVAILABLE',
    label: 'AVAILABLE',
    className: 'status status-available',
    badgeTone: 'available',
    daysLeft: days,
    daysLabel: `${days}d left`,
  };
}

export default function SensorsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'replacements'>('inventory');

  
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [replacements, setReplacements] = useState<SensorReplacement[]>([]);
  const [replQuery, setReplQuery] = useState('');
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [replacementsError, setReplacementsError] = useState('');

  
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [formIssue, setFormIssue] = useState('');
  const [formNotes, setFormNotes] = useState('');

  
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSensor, setAssignSensor] = useState<Sensor | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [assignCustomerQuery, setAssignCustomerQuery] = useState('');
  const [assignInstalledDate, setAssignInstalledDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [assignReason, setAssignReason] = useState('Standard clinical telemetry monitoring');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const assignFilteredCustomers = useMemo(() => {
    const q = assignCustomerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.customerNumber} ${c.email ?? ''} ${c.phone ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [customers, assignCustomerQuery]);

  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AssignmentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadSensors = async () => {
    setLoading(true);
    setError('');
    try {
      const [sensorRes, custRes] = await Promise.all([
        apiFetch<SensorResponse>('/sensors?limit=100'),
        apiFetch<CustomerResponse>('/customers?limit=100').catch(() => ({ data: [], total: 0 })),
      ]);
      setSensors(sensorRes.data);
      setCustomers(custRes.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load sensors');
    } finally {
      setLoading(false);
    }
  };

  const loadReplacements = async () => {
    setReplacementsLoading(true);
    setReplacementsError('');
    try {
      const result = await apiFetch<ReplacementResponse>('/sensors/replacements?limit=100');
      setReplacements(result.data);
    } catch (caught) {
      setReplacementsError(caught instanceof Error ? caught.message : 'Unable to load replacement log');
    } finally {
      setReplacementsLoading(false);
    }
  };

  useEffect(() => {
    void loadSensors();
    void loadReplacements();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => {
      void loadSensors();
      void loadReplacements();
    }).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  const sensorsWithEffectiveStatus = useMemo(() => {
    return sensors.map((sensor) => ({
      ...sensor,
      effective: getSensorEffectiveStatus(sensor),
    }));
  }, [sensors]);

  const filteredSensors = useMemo(() => {
    return sensorsWithEffectiveStatus.filter((sensor) => {
      const matchStatus =
        statusFilter === 'All statuses' ||
        sensor.effective.key === statusFilter ||
        sensor.status === statusFilter;

      const searchableText = `${sensor.serialNumber} ${sensor.sensorTypeName || ''} ${
        sensor.sensorTypeCode || ''
      } ${sensor.sensorTypeId} ${sensor.manufacturer || ''} ${sensor.model || ''} ${
        sensor.customerName || ''
      } ${sensor.customerNumber || ''} ${sensor.effective.label}`.toLowerCase();

      const matchQuery = !query || searchableText.includes(query.toLowerCase().trim());
      return matchStatus && matchQuery;
    });
  }, [sensorsWithEffectiveStatus, query, statusFilter]);

  const filteredReplacements = useMemo(
    () =>
      replacements.filter((r) =>
        `${r.customerName} ${r.serialNumber} ${r.issueType} ${r.notes || ''}`
          .toLowerCase()
          .includes(replQuery.toLowerCase())
      ),
    [replacements, replQuery]
  );

  
  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let available = 0;
    let expired = 0;
    sensorsWithEffectiveStatus.forEach((s) => {
      if (s.effective.key === 'ACTIVE') active++;
      else if (s.effective.key === 'EXPIRING_SOON') expiring++;
      else if (s.effective.key === 'AVAILABLE') available++;
      else if (s.effective.key === 'EXPIRED') expired++;
    });
    return { total: sensors.length, active, expiring, available, expired };
  }, [sensors.length, sensorsWithEffectiveStatus]);

  const handleOpenAssign = (sensor: Sensor) => {
    setAssignSensor(sensor);
    setSelectedCustomerId(sensor.customerId || (customers[0]?._id ?? ''));
    setAssignCustomerQuery('');
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setAssignInstalledDate(`${year}-${month}-${day}`);
    setAssignReason('Standard clinical telemetry monitoring');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSensor || !selectedCustomerId) return;
    setAssignSubmitting(true);
    try {
      await apiFetch(`/sensors/${assignSensor._id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          installedAt: assignInstalledDate ? new Date(assignInstalledDate).toISOString() : new Date().toISOString(),
          reason: assignReason.trim() || undefined,
        }),
      });
      setAssignModalOpen(false);
      setAssignSensor(null);
      await loadSensors();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to assign sensor');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleOpenReplace = (sensor: Sensor) => {
    setFormCustomerName(sensor.customerName || '');
    setFormSerial(sensor.serialNumber);
    setFormDate(new Date().toISOString().split('T')[0] ?? '');
    setFormIssue('Sensor expiration replacement');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenHistory = async (sensor: Sensor) => {
    setHistorySensor(sensor);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const records = await apiFetch<AssignmentRecord[]>(`/sensors/${sensor._id}/history`);
      setHistoryRecords(records || []);
    } catch {
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName || !formSerial || !formDate || !formIssue) return;
    setSubmitting(true);
    try {
      await apiFetch('/sensors/replacements', {
        method: 'POST',
        body: JSON.stringify({
          customerName: formCustomerName,
          serialNumber: formSerial,
          replacedDate: formDate,
          issueType: formIssue,
          notes: formNotes || undefined,
        }),
      });
      setModalOpen(false);
      setFormCustomerName('');
      setFormSerial('');
      setFormDate(new Date().toISOString().split('T')[0] ?? '');
      setFormIssue('');
      setFormNotes('');
      await loadReplacements();
      setActiveTab('replacements');
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to log replacement');
    } finally {
      setSubmitting(false);
    }
  };

  const topbarRight = (
    <div className="header-actions-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        type="button"
        className={activeTab === 'replacements' ? 'primary-button' : 'secondary-button'}
        onClick={() => setActiveTab(activeTab === 'inventory' ? 'replacements' : 'inventory')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          ...(activeTab !== 'replacements' && replacements.length > 0
            ? { borderColor: '#fde68a', color: '#d97706' }
            : {}),
        }}
      >
        {activeTab === 'inventory' ? (
          <>
            <AlertTriangle size={15} style={{ color: '#d97706' }} />
            <span>Replacements ({replacements.length})</span>
          </>
        ) : (
          <>
            <Boxes size={15} />
            <span>Inventory ({sensors.length})</span>
          </>
        )}
      </button>
      <Link className="primary-button" href="/sensors/new">
        <Plus size={17} /> <span>Add sensor</span>
      </Link>
    </div>
  );

  return (
    <AppShell headerActions={topbarRight}>
      <div className="page-content">
        {/* Metric Summary KPI Cards */}
        <section className="mini-stat-grid" style={{ marginBottom: '20px' }}>
          <div className="mini-stat">
            <div className="mini-stat-top">
              <span>Total sensors</span>
              <Boxes size={18} />
            </div>
            <strong>{stats.total}</strong>
            <small>In hardware catalog</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <div className="mini-stat-top">
              <span>Active in service</span>
              <Activity size={18} />
            </div>
            <strong>{stats.active}</strong>
            <small>Assigned to customers</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top">
              <span>Expiring soon</span>
              <Clock size={18} />
            </div>
            <strong>{stats.expiring}</strong>
            <small>Expiring within 30 days</small>
          </div>
          <div className="mini-stat mini-stat-blue">
            <div className="mini-stat-top">
              <span>Available inventory</span>
              <CheckCircle2 size={18} />
            </div>
            <strong>{stats.available}</strong>
            <small>Ready for assignment</small>
          </div>
        </section>

        
        {activeTab === 'inventory' && (
          <>
            {loading && (
              <div className="data-loading">
                <RefreshCw size={18} className="spin" /> Loading live sensors...
              </div>
            )}
            {error && (
              <div className="data-error">
                <span>{error}</span>
                <button className="secondary-button" onClick={() => void loadSensors()}>
                  Try again
                </button>
              </div>
            )}
            {!loading && !error && (
              <section className="panel" style={{ padding: '20px 22px', marginBottom: '24px' }}>
                <div className="panel-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div>
                    <p className="eyebrow">Inventory telemetry register</p>
                    <h2>Hardware Sensors & Deployments</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="search-field" style={{ width: '280px', maxWidth: '100%' }}>
                      <Search size={16} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search serial, type, customer..."
                      />
                    </div>
                    <select
                      className="select-control"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ width: 'auto', minWidth: '150px' }}
                    >
                      <option value="All statuses">All statuses</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRING_SOON">EXPIRING SOON</option>
                      <option value="AVAILABLE">AVAILABLE (Unassigned)</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                    <span className="result-count">{filteredSensors.length} loaded</span>
                  </div>
                </div>
                {filteredSensors.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No matching sensor records</h2>
                    <p>Try adjusting your search criteria or register a new device.</p>
                  </div>
                ) : (
                  <div
                    className="table-wrap custom-scrollbar"
                    style={{
                      overflowX: 'auto',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                      width: '100%',
                    }}
                  >
                    <table className="rich-table" style={{ width: '100%', minWidth: '700px', tableLayout: 'auto' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                        <tr>
                          <th style={{ background: '#ffffff' }}>Serial Number</th>
                          <th style={{ background: '#ffffff' }}>Sensor Type & Model</th>
                          <th style={{ background: '#ffffff' }}>Assigned Customer</th>
                          <th style={{ background: '#ffffff' }}>Installed Date</th>
                          <th style={{ background: '#ffffff' }}>Expiration Date</th>
                          <th style={{ background: '#ffffff' }}>Status</th>
                          <th style={{ textAlign: 'right', background: '#ffffff' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSensors.map((sensor) => (
                          <tr key={sensor._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong className="serial">{sensor.serialNumber}</strong>
                              </div>
                            </td>
                            <td>
                              <div>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontWeight: 600,
                                    color: '#1e293b',
                                  }}
                                >
                                  <Tag size={13} style={{ color: '#0f766e' }} />
                                  {sensor.sensorTypeName || sensor.sensorTypeCode || sensor.sensorTypeId}
                                </span>
                                {(sensor.manufacturer || sensor.model) && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {[sensor.manufacturer, sensor.model].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {sensor.customerName ? (
                                <Link
                                  href={`/customers/${sensor.customerId}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#0f766e',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <User size={13} style={{ color: '#64748b' }} />
                                  <span>{sensor.customerName}</span>
                                  {sensor.customerNumber && (
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                      ({sensor.customerNumber})
                                    </span>
                                  )}
                                </Link>
                              ) : (
                                <span
                                  className="muted-cell"
                                  style={{ fontStyle: 'italic', fontSize: '12px' }}
                                >
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 500, color: '#334155', fontSize: '13px' }}>
                                {formatDate(sensor.installedAt || sensor.activatedAt)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 500 }}>{formatDate(sensor.expiresAt)}</span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background:
                                      sensor.effective.badgeTone === 'critical'
                                        ? '#fee2e2'
                                        : sensor.effective.badgeTone === 'warning'
                                        ? '#fef3c7'
                                        : '#f1f5f9',
                                    color:
                                      sensor.effective.badgeTone === 'critical'
                                        ? '#dc2626'
                                        : sensor.effective.badgeTone === 'warning'
                                        ? '#b45309'
                                        : '#64748b',
                                  }}
                                >
                                  {sensor.effective.daysLabel}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={sensor.effective.className}>
                                <i />
                                {sensor.effective.label}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  gap: '6px',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                }}
                              >
                                {sensor.customerId ? (
                                  <>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => handleOpenReplace(sensor)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '5px 9px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#d97706',
                                        borderColor: '#fde68a',
                                      }}
                                    >
                                      <AlertTriangle size={12} /> Replace
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => handleOpenAssign(sensor)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '5px 9px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <ArrowRightLeft size={12} /> Reassign
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => handleOpenAssign(sensor)}
                                    style={{
                                      fontSize: '11px',
                                      padding: '5px 10px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <UserPlus size={12} /> Assign
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleOpenHistory(sensor)}
                                  style={{
                                    fontSize: '11px',
                                    padding: '5px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="View assignment audit history"
                                >
                                  <History size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        
        {activeTab === 'replacements' && (
          <>
            {replacementsLoading && (
              <div className="data-loading">
                <RefreshCw size={18} className="spin" /> Loading replacement log...
              </div>
            )}
            {replacementsError && (
              <div className="data-error">
                <span>{replacementsError}</span>
                <button className="secondary-button" onClick={() => void loadReplacements()}>
                  Try again
                </button>
              </div>
            )}
            {!replacementsLoading && !replacementsError && (
              <section className="panel" style={{ padding: '20px 22px', marginBottom: '24px' }}>
                <div className="panel-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div>
                    <p className="eyebrow">Issue & Maintenance Log</p>
                    <h2>Sensor Replacement Records</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="search-field" style={{ width: '260px', maxWidth: '100%' }}>
                      <Search size={16} />
                      <input
                        value={replQuery}
                        onChange={(e) => setReplQuery(e.target.value)}
                        placeholder="Search customer, serial or issue..."
                      />
                    </div>
                    <span className="result-count">{filteredReplacements.length} records</span>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        setFormCustomerName('');
                        setFormSerial('');
                        setFormDate(new Date().toISOString().split('T')[0] ?? '');
                        setFormIssue('');
                        setFormNotes('');
                        setModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#d97706',
                        borderColor: '#d97706',
                      }}
                    >
                      <Plus size={16} /> Log replacement
                    </button>
                  </div>
                </div>
                {filteredReplacements.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No replacement records</h2>
                    <p>Use the &quot;Log Replacement&quot; button to record a sensor issue or replacement.</p>
                  </div>
                ) : (
                  <div
                    className="table-wrap custom-scrollbar"
                    style={{
                      overflowX: 'auto',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                      width: '100%',
                    }}
                  >
                    <table className="rich-table" style={{ width: '100%', minWidth: '700px', tableLayout: 'auto' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                        <tr>
                          <th style={{ background: '#ffffff' }}>Customer Name</th>
                          <th style={{ background: '#ffffff' }}>Serial Number</th>
                          <th style={{ background: '#ffffff' }}>Replaced Date</th>
                          <th style={{ background: '#ffffff' }}>Issue Type</th>
                          <th style={{ background: '#ffffff' }}>Notes</th>
                          <th style={{ background: '#ffffff' }}>Logged At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReplacements.map((r) => (
                          <tr key={r._id}>
                            <td>
                              <strong>{r.customerName}</strong>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  color: '#0f766e',
                                  background: '#f0fdf4',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {r.serialNumber}
                              </span>
                            </td>
                            <td>
                              {new Date(r.replacedDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#d97706',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                }}
                              >
                                <AlertTriangle size={13} />
                                {r.issueType}
                              </span>
                            </td>
                            <td
                              className="muted-cell"
                              style={{
                                fontSize: '12px',
                                maxWidth: '240px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {r.notes ?? '—'}
                            </td>
                            <td className="muted-cell">
                              {r.createdAt ? formatDate(r.createdAt) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        
        {assignModalOpen && assignSensor && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '480px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>
                    {assignSensor.customerId ? 'Reinstall / Reassign Sensor' : 'Install Sensor for Customer'}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Serial: <strong style={{ fontFamily: 'monospace' }}>{assignSensor.serialNumber}</strong>
                    {assignSensor.sensorTypeName && assignSensor.sensorTypeName !== 'default' ? ` (${assignSensor.sensorTypeName})` : ''}
                  </p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleConfirmAssign}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                        Select Customer <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      {assignCustomerQuery && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {assignFilteredCustomers.length} {assignFilteredCustomers.length === 1 ? 'match' : 'matches'}
                        </span>
                      )}
                    </div>

                    <div className="search-field" style={{ width: '100%', maxWidth: '100%', position: 'relative' }}>
                      <Search size={15} />
                      <input
                        type="text"
                        value={assignCustomerQuery}
                        onChange={(e) => setAssignCustomerQuery(e.target.value)}
                        placeholder="Search customer name, ID, phone, or email..."
                        style={{ height: '36px', fontSize: '13px', width: '100%', paddingRight: assignCustomerQuery ? '28px' : '10px' }}
                      />
                      {assignCustomerQuery && (
                        <button
                          type="button"
                          onClick={() => setAssignCustomerQuery('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          aria-label="Clear customer search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="select-control"
                      style={{ width: '100%', marginTop: '2px', height: '38px' }}
                    >
                      <option value="" disabled>
                        {assignFilteredCustomers.length === 0 ? 'No customers found matching search' : 'Choose customer to assign...'}
                      </option>
                      {assignFilteredCustomers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.firstName} {c.lastName} ({c.customerNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <label>
                    Installation Date <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      type="date"
                      required
                      value={assignInstalledDate}
                      onChange={(e) => setAssignInstalledDate(e.target.value)}
                      style={{ marginTop: '4px' }}
                    />
                  </label>

                  <label>
                    Installation Clinical Reason
                    <input
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                      style={{ marginTop: '4px' }}
                    />
                  </label>
                </div>
                <div
                  className="modal-actions"
                  style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
                >
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={assignSubmitting}>
                    {assignSubmitting ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <>
                        <UserCheck size={15} /> Confirm Installation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '500px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Log Sensor Replacement</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Record a sensor issue or maintenance replacement in compliance logs.
                  </p>
                </div>
                <button className="icon-button" type="button" onClick={() => setModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleLogReplacement}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label>
                    <span>Customer Name <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Serial Number <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value.toUpperCase())}
                      style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                    />
                  </label>
                  <label>
                    <span>Replacement / Issue Date <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Issue Type <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      value={formIssue}
                      onChange={(e) => setFormIssue(e.target.value)}
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                      Describe the specific hardware issue, wear expiration, or reason
                    </small>
                  </label>
                  <label>
                    Clinical Notes (optional)
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                </div>
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={submitting}
                    style={{ background: '#d97706', borderColor: '#d97706' }}
                  >
                    {submitting ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <>
                        <AlertTriangle size={14} /> Save Record
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {historyModalOpen && historySensor && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '560px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Assignment & Telemetry History</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Sensor: <strong style={{ fontFamily: 'monospace' }}>{historySensor.serialNumber}</strong>
                    {historySensor.sensorTypeName && historySensor.sensorTypeName !== 'default' ? ` (${historySensor.sensorTypeName})` : ''}
                  </p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {historyLoading ? (
                <div className="data-loading">
                  <RefreshCw size={16} className="spin" /> Loading timeline...
                </div>
              ) : historyRecords.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                  <Info size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    No previous assignment records logged for this device.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {historyRecords.map((rec, idx) => (
                    <div
                      key={rec._id || idx}
                      style={{
                        padding: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        <span>
                          {rec.unassignedAt ? 'Previous Assignment' : '🟢 Current Active Assignment'}
                        </span>
                        <span style={{ color: '#64748b', fontWeight: 400 }}>
                          {formatDate(rec.assignedAt)}
                          {rec.unassignedAt ? ` — ${formatDate(rec.unassignedAt)}` : ''}
                        </span>
                      </div>
                      {rec.reason && (
                        <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                          <strong>Reason:</strong> {rec.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
