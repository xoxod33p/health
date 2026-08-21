'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Calendar,
  Edit3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiFetch } from '../../../lib/api';
import { connectRealtime } from '../../../lib/realtime';

type Customer = {
  _id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  status: string;
  createdAt?: string;
};

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

type SensorReplacement = {
  _id: string;
  customerName: string;
  serialNumber: string;
  replacedDate: string;
  issueType: string;
  notes?: string;
  createdAt?: string;
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

function getSensorStatusBadge(sensor: Sensor) {
  const days = getDaysRemaining(sensor.expiresAt);
  const isPast = days < 0;

  if (sensor.status === 'EXPIRED' || isPast) {
    return {
      label: 'EXPIRED',
      className: 'status status-critical',
      daysLabel: isPast ? `Expired ${Math.abs(days)}d ago` : 'Expired',
      tone: 'critical',
    };
  }

  if (sensor.status === 'DISABLED' || sensor.status === 'REPLACED') {
    return {
      label: sensor.status,
      className: 'status status-critical',
      daysLabel: `${days}d left`,
      tone: 'critical',
    };
  }

  if (days >= 0 && days <= 7) {
    return {
      label: 'EXPIRING SOON',
      className: 'status status-warning',
      daysLabel: `${days}d left`,
      tone: 'warning',
    };
  }

  return {
    label: 'ACTIVE',
    className: 'status status-healthy',
    daysLabel: `${days}d left`,
    tone: 'healthy',
  };
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allSensors, setAllSensors] = useState<Sensor[]>([]);
  const [replacements, setReplacements] = useState<SensorReplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editSaving, setEditSaving] = useState(false);

  
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [assignInstalledDate, setAssignInstalledDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [assignReason, setAssignReason] = useState('Standard clinical telemetry monitoring');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceSerial, setReplaceSerial] = useState('');
  const [replaceDate, setReplaceDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [replaceIssue, setReplaceIssue] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);

  const loadData = async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    try {
      const [custData, sensorsRes, replRes] = await Promise.all([
        apiFetch<Customer>(`/customers/${customerId}`),
        apiFetch<{ data: Sensor[] }>('/sensors?limit=100').catch(() => ({ data: [] })),
        apiFetch<{ data: SensorReplacement[] }>('/sensors/replacements?limit=100').catch(() => ({ data: [] })),
      ]);
      setCustomer(custData);
      setAllSensors(sensorsRes.data || []);
      setReplacements(replRes.data || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => {
      void loadData();
    }).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, [customerId]);

  
  const assignedSensors = useMemo(() => {
    if (!customer) return [];
    return allSensors.filter((s) => {
      if (s.customerId && String(s.customerId) === String(customer._id)) return true;
      if (
        s.customerNumber &&
        customer.customerNumber &&
        s.customerNumber.toLowerCase() === customer.customerNumber.toLowerCase()
      ) {
        return true;
      }
      return false;
    });
  }, [allSensors, customer]);

  
  const availableSensors = useMemo(() => {
    return allSensors.filter((s) => !s.customerId || s.status === 'AVAILABLE');
  }, [allSensors]);

  
  const customerReplacements = useMemo(() => {
    if (!customer) return [];
    const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
    const assignedSerials = new Set(assignedSensors.map((s) => s.serialNumber.toLowerCase()));
    return replacements.filter(
      (r) =>
        r.customerName.toLowerCase().includes(fullName) ||
        fullName.includes(r.customerName.toLowerCase()) ||
        assignedSerials.has(r.serialNumber.toLowerCase())
    );
  }, [replacements, customer, assignedSensors]);

  const handleOpenEdit = () => {
    if (!customer) return;
    setEditFirstName(customer.firstName);
    setEditLastName(customer.lastName);
    setEditEmail(customer.email || '');
    setEditPhone(customer.phone || '');
    setEditAddress(customer.address || '');
    setEditStatus(customer.status || 'ACTIVE');
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setEditSaving(true);
    try {
      const updated = await apiFetch<Customer>(`/customers/${customer._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
          address: editAddress.trim() || undefined,
          status: editStatus,
        }),
      });
      setCustomer(updated);
      setEditOpen(false);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to update customer');
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenAssign = () => {
    setSelectedSensorId(availableSensors[0]?._id ?? '');
    setAssignReason('Standard clinical telemetry monitoring');
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setAssignInstalledDate(`${year}-${month}-${day}`);
    setAssignOpen(true);
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !selectedSensorId) return;
    setAssignSubmitting(true);
    try {
      await apiFetch(`/sensors/${selectedSensorId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer._id,
          installedAt: assignInstalledDate ? new Date(assignInstalledDate).toISOString() : new Date().toISOString(),
          reason: assignReason.trim() || undefined,
        }),
      });
      setAssignOpen(false);
      await loadData();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to assign sensor');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleOpenReplace = (serialNumber: string) => {
    if (!customer) return;
    setReplaceSerial(serialNumber);
    setReplaceDate(new Date().toISOString().split('T')[0] ?? '');
    setReplaceIssue('Routine sensor expiration replacement');
    setReplaceNotes('');
    setReplaceOpen(true);
  };

  const handleSaveReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !replaceSerial || !replaceIssue) return;
    setReplaceSubmitting(true);
    try {
      await apiFetch('/sensors/replacements', {
        method: 'POST',
        body: JSON.stringify({
          customerName: `${customer.firstName} ${customer.lastName}`,
          serialNumber: replaceSerial.toUpperCase().trim(),
          replacedDate: replaceDate,
          issueType: replaceIssue.trim(),
          notes: replaceNotes.trim() || undefined,
        }),
      });
      setReplaceOpen(false);
      await loadData();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to log replacement');
    } finally {
      setReplaceSubmitting(false);
    }
  };

  const initials = customer ? `${customer.firstName[0] || ''}${customer.lastName[0] || ''}`.toUpperCase() : 'PT';

  return (
    <AppShell>
      <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <Link
            href="/customers"
            className="secondary-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              padding: '7px 12px',
            }}
          >
            <ArrowLeft size={15} /> Back to customer directory
          </Link>
          {customer && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleOpenAssign}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  padding: '7px 12px',
                }}
              >
                <UserPlus size={15} style={{ color: '#0f766e' }} /> Assign New Sensor
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleOpenEdit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  padding: '7px 14px',
                }}
              >
                <Edit3 size={15} /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="data-loading" style={{ margin: '40px 0' }}>
            <RefreshCw size={18} className="spin" /> Loading customer profile...
          </div>
        )}

        {error && (
          <div className="data-error" style={{ margin: '30px 0' }}>
            <AlertTriangle size={20} />
            <div>
              <strong>Customer record error</strong>
              <span>{error}</span>
            </div>
            <button className="secondary-button" onClick={() => void loadData()}>
              Retry
            </button>
          </div>
        )}

        {customer && (
          <>
            
            <section
              className="panel"
              style={{
                padding: '24px 28px',
                marginBottom: '24px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 800,
                          color: '#0f172a',
                          fontFamily: 'Manrope, sans-serif',
                        }}
                      >
                        {customer.firstName} {customer.lastName}
                      </h1>
                      <span
                        className={`status ${
                          customer.status === 'ACTIVE' ? 'status-healthy' : 'status-warning'
                        }`}
                        style={{ fontSize: '11px', padding: '3px 9px' }}
                      >
                        <i />
                        {customer.status}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginTop: '8px',
                        flexWrap: 'wrap',
                        color: '#64748b',
                        fontSize: '13px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {customer.customerNumber}
                      </span>
                      {customer.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={13} style={{ color: '#94a3b8' }} />
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={13} style={{ color: '#94a3b8' }} />
                          {customer.phone}
                        </span>
                      )}
                      {customer.address && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} style={{ color: '#94a3b8' }} />
                          {customer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      minWidth: '100px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Active Sensors</span>
                    <strong style={{ fontSize: '18px', color: '#0f766e', fontWeight: 800 }}>
                      {assignedSensors.length}
                    </strong>
                  </div>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      minWidth: '100px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Replacements</span>
                    <strong style={{ fontSize: '18px', color: '#d97706', fontWeight: 800 }}>
                      {customerReplacements.length}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: '20px',
                alignItems: 'flex-start',
              }}
            >
              
              <section className="panel" style={{ padding: '22px' }}>
                <div className="panel-heading" style={{ marginBottom: '16px' }}>
                  <div>
                    <p className="eyebrow">Customer Record</p>
                    <h2 style={{ fontSize: '16px' }}>Demographics & Contact</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleOpenEdit}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      FULL NAME
                    </span>
                    <strong style={{ fontSize: '14px', color: '#0f172a', marginTop: '2px', display: 'block' }}>
                      {customer.firstName} {customer.lastName}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      EMAIL ADDRESS
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Mail size={13} style={{ color: '#0f766e' }} />
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>
                        {customer.email ?? 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      TELEPHONE NUMBER
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Phone size={13} style={{ color: '#0f766e' }} />
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>
                        {customer.phone ?? 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      POSTAL ADDRESS
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <MapPin size={13} style={{ color: '#0f766e' }} />
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>
                        {customer.address ?? 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #edf1f1',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      SYSTEM REGISTRATION
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Calendar size={13} style={{ color: '#0f766e' }} />
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>
                        {formatDate(customer.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <section className="panel" style={{ padding: '22px' }}>
                  <div className="panel-heading" style={{ marginBottom: '16px' }}>
                    <div>
                      <p className="eyebrow">Hardware Deployments</p>
                      <h2 style={{ fontSize: '16px' }}>
                        Installed Telemetry Sensors ({assignedSensors.length})
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleOpenAssign}
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Plus size={14} /> Install Sensor
                    </button>
                  </div>

                  {assignedSensors.length === 0 ? (
                    <div className="empty-panel" style={{ padding: '28px 16px' }}>
                      <Boxes size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                      <h3 style={{ fontSize: '15px', color: '#0f172a', margin: '4px 0' }}>
                        No sensors installed yet
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Install and connect an active telemetry device to monitor this customer.
                      </p>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleOpenAssign}
                        style={{ fontSize: '12px' }}
                      >
                        <UserPlus size={14} /> Install Available Sensor
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="desktop-table-view">
                        <div className="table-wrap custom-scrollbar" style={{ border: '1px solid #edf1f1', borderRadius: '6px' }}>
                          <table className="rich-table">
                            <thead style={{ background: '#f8fafc' }}>
                              <tr>
                                <th>Serial Number</th>
                                <th>Installation Date</th>
                                <th>Expiration Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignedSensors.map((sensor) => {
                                const badge = getSensorStatusBadge(sensor);
                                return (
                                  <tr key={sensor._id}>
                                    <td>
                                      <strong className="serial" style={{ fontSize: '13px' }}>
                                        {sensor.serialNumber}
                                      </strong>
                                    </td>
                                    <td>
                                      <span style={{ fontWeight: 500, color: '#334155' }}>
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
                                              badge.tone === 'critical'
                                                ? '#fee2e2'
                                                : badge.tone === 'warning'
                                                ? '#fef3c7'
                                                : '#f1f5f9',
                                            color:
                                              badge.tone === 'critical'
                                                ? '#dc2626'
                                                : badge.tone === 'warning'
                                                ? '#b45309'
                                                : '#64748b',
                                          }}
                                        >
                                          {badge.daysLabel}
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={badge.className}>
                                        <i />
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button
                                          type="button"
                                          className="secondary-button"
                                          onClick={() => handleOpenReplace(sensor.serialNumber)}
                                          style={{
                                            fontSize: '11px',
                                            padding: '4px 8px',
                                            color: '#d97706',
                                            borderColor: '#fde68a',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          <AlertTriangle size={12} /> Replace
                                        </button>
                                        <Link
                                          href="/sensors"
                                          className="secondary-button"
                                          style={{
                                            fontSize: '11px',
                                            padding: '4px 8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                          title="Manage in inventory"
                                        >
                                          <ExternalLink size={12} />
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="mobile-cards-view">
                        {assignedSensors.map((sensor) => {
                          const badge = getSensorStatusBadge(sensor);
                          return (
                            <article className="mobile-card" key={`mobile-${sensor._id}`}>
                              <div className="mobile-card-header">
                                <div className="mobile-card-title">
                                  <strong className="serial" style={{ fontSize: '13px' }}>
                                    {sensor.serialNumber}
                                  </strong>
                                </div>
                                <span className={badge.className}>
                                  <i />
                                  {badge.label}
                                </span>
                              </div>

                              <div className="mobile-card-body">
                                <div className="mobile-card-field">
                                  <span className="mobile-card-field-label">Installation</span>
                                  <span className="mobile-card-field-value">
                                    {formatDate(sensor.installedAt || sensor.activatedAt)}
                                  </span>
                                </div>

                                <div className="mobile-card-field">
                                  <span className="mobile-card-field-label">Expiration</span>
                                  <span className="mobile-card-field-value">
                                    <span style={{ display: 'block' }}>{formatDate(sensor.expiresAt)}</span>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        marginTop: '2px',
                                        display: 'inline-block',
                                        background:
                                          badge.tone === 'critical'
                                            ? '#fee2e2'
                                            : badge.tone === 'warning'
                                            ? '#fef3c7'
                                            : '#f1f5f9',
                                        color:
                                          badge.tone === 'critical'
                                            ? '#dc2626'
                                            : badge.tone === 'warning'
                                            ? '#b45309'
                                            : '#64748b',
                                      }}
                                    >
                                      {badge.daysLabel}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <div className="mobile-card-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleOpenReplace(sensor.serialNumber)}
                                  style={{ color: '#d97706', borderColor: '#fde68a' }}
                                >
                                  <AlertTriangle size={13} /> Log Replacement
                                </button>
                                <Link
                                  href="/sensors"
                                  className="secondary-button"
                                  style={{ flex: '0 0 auto', padding: '0 12px' }}
                                  title="Manage in inventory"
                                >
                                  <ExternalLink size={13} />
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>

                
                {customerReplacements.length > 0 && (
                  <section className="panel" style={{ padding: '22px' }}>
                    <div className="panel-heading" style={{ marginBottom: '14px' }}>
                      <div>
                        <p className="eyebrow">Compliance Trail</p>
                        <h2 style={{ fontSize: '16px' }}>
                          Maintenance & Issue Records ({customerReplacements.length})
                        </h2>
                      </div>
                    </div>
                    {/* Desktop Table View */}
                    <div className="desktop-table-view">
                      <div className="table-wrap custom-scrollbar" style={{ border: '1px solid #edf1f1', borderRadius: '6px' }}>
                        <table className="rich-table">
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th>Serial Number</th>
                              <th>Replaced Date</th>
                              <th>Issue Type</th>
                              <th>Clinical Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerReplacements.map((r) => (
                              <tr key={r._id}>
                                <td>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      color: '#0f766e',
                                      background: '#f0fdf4',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {r.serialNumber}
                                  </span>
                                </td>
                                <td>{formatDate(r.replacedDate)}</td>
                                <td>
                                  <span style={{ color: '#d97706', fontWeight: 600, fontSize: '12px' }}>
                                    {r.issueType}
                                  </span>
                                </td>
                                <td className="muted-cell" style={{ fontSize: '12px' }}>
                                  {r.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="mobile-cards-view">
                      {customerReplacements.map((r) => (
                        <article className="mobile-card" key={`mobile-repl-${r._id}`}>
                          <div className="mobile-card-header">
                            <div className="mobile-card-title">
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: '#0f766e',
                                  background: '#f0fdf4',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {r.serialNumber}
                              </span>
                            </div>
                            <span style={{ color: '#d97706', fontWeight: 600, fontSize: '11px', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                              {r.issueType}
                            </span>
                          </div>

                          <div className="mobile-card-body">
                            <div className="mobile-card-field">
                              <span className="mobile-card-field-label">Replaced Date</span>
                              <span className="mobile-card-field-value">{formatDate(r.replacedDate)}</span>
                            </div>

                            {r.notes && (
                              <div className="mobile-card-field full-width">
                                <span className="mobile-card-field-label">Notes</span>
                                <span className="mobile-card-field-value" style={{ color: '#475569', fontSize: '12px' }}>
                                  {r.notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        )}

        
        {editOpen && customer && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '480px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Edit Customer Profile</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Update contact information and active status.
                  </p>
                </div>
                <button className="icon-button" type="button" onClick={() => setEditOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                      <input
                        required
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                      />
                    </label>
                    <label>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                      <input
                        required
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Email Address
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Phone Number
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </label>
                  <label>
                    Postal Address
                    <input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </label>
                  <label>
                    Customer Status
                    <select
                      className="select-control"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </label>
                </div>
                <div
                  className="modal-actions"
                  style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
                >
                  <button className="secondary-button" type="button" onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={editSaving}>
                    {editSaving ? <RefreshCw size={15} className="spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {assignOpen && customer && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '480px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Install Sensor for Customer</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Customer: <strong>{customer.firstName} {customer.lastName}</strong> ({customer.customerNumber})
                  </p>
                </div>
                <button className="icon-button" type="button" onClick={() => setAssignOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleConfirmAssign}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {availableSensors.length === 0 ? (
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '6px', color: '#b45309', fontSize: '12px' }}>
                      <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      No unassigned sensors available in inventory. Please add a new sensor first.
                    </div>
                  ) : (
                    <>
                      <label>
                        Select Available Sensor <span style={{ color: '#ef4444' }}>*</span>
                        <select
                          required
                          value={selectedSensorId}
                          onChange={(e) => setSelectedSensorId(e.target.value)}
                          className="select-control"
                          style={{ width: '100%', marginTop: '4px' }}
                        >
                          <option value="" disabled>Choose a sensor...</option>
                          {availableSensors.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.serialNumber}
                            </option>
                          ))}
                        </select>
                      </label>
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
                    </>
                  )}
                </div>
                <div
                  className="modal-actions"
                  style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
                >
                  <button className="secondary-button" type="button" onClick={() => setAssignOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={assignSubmitting || availableSensors.length === 0}
                  >
                    {assignSubmitting ? (
                      <RefreshCw size={15} className="spin" />
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

        
        {replaceOpen && customer && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '480px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Log Sensor Replacement</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Record maintenance replacement for {customer.firstName} {customer.lastName}.
                  </p>
                </div>
                <button className="icon-button" type="button" onClick={() => setReplaceOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveReplacement}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label>
                    <span>Serial Number <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      value={replaceSerial}
                      onChange={(e) => setReplaceSerial(e.target.value.toUpperCase())}
                      style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </label>
                  <label>
                    <span>Replaced Date <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      type="date"
                      value={replaceDate}
                      onChange={(e) => setReplaceDate(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Issue Type <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      required
                      value={replaceIssue}
                      onChange={(e) => setReplaceIssue(e.target.value)}
                    />
                  </label>
                  <label>
                    Clinical Notes (optional)
                    <textarea
                      value={replaceNotes}
                      onChange={(e) => setReplaceNotes(e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                </div>
                <div className="modal-actions" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="secondary-button" type="button" onClick={() => setReplaceOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={replaceSubmitting}
                    style={{ background: '#d97706', borderColor: '#d97706' }}
                  >
                    {replaceSubmitting ? <RefreshCw size={15} className="spin" /> : <><AlertTriangle size={14} /> Save Record</>}
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
