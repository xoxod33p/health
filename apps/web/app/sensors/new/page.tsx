'use client';

import { Check, RefreshCw, Search, UserCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiFetch } from '../../../lib/api';

type CustomerItem = {
  _id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};

type CustomerResponse = {
  data: CustomerItem[];
};

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateString(dateStr: string, days = 15): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewSensorPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [serialNumber, setSerialNumber] = useState('');
  const [installedAt, setInstalledAt] = useState(getTodayDate);
  const [expiresAt, setExpiresAt] = useState(() => addDaysToDateString(getTodayDate(), 15));
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInstalledAtChange = (newDate: string) => {
    setInstalledAt(newDate);
    if (newDate) {
      setExpiresAt(addDaysToDateString(newDate, 15));
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.customerNumber} ${c.phone ?? ''} ${c.email ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [customers, customerSearchQuery]);

  useEffect(() => {
    let mounted = true;
    async function loadCustomers() {
      try {
        const cRes = await apiFetch<CustomerResponse>('/customers?limit=100').catch(() => ({ data: [] }));
        if (mounted) {
          setCustomers(cRes.data || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serialNumber.trim()) return;

    setSaving(true);
    setError('');

    try {
      const installDateIso = installedAt ? new Date(installedAt).toISOString() : new Date().toISOString();
      const expireDateIso = expiresAt
        ? new Date(expiresAt).toISOString()
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const createdSensor = await apiFetch<{ _id: string }>('/sensors', {
        method: 'POST',
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          sensorTypeId: 'default',
          installedAt: installDateIso,
          expiresAt: expireDateIso,
        }),
      });

      if (selectedCustomer && createdSensor?._id) {
        await apiFetch(`/sensors/${createdSensor._id}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            customerId: selectedCustomer._id,
            installedAt: installDateIso,
          }),
        }).catch(() => null);
      }

      router.push('/sensors');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create sensor record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Add a sensor">
      <div className="page-content">
        <section className="panel" style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 26px' }}>
          <div className="panel-heading" style={{ marginBottom: '18px' }}>
            <div>
              <p className="eyebrow">Hardware telemetry register</p>
              <h2>Add New Sensor</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label style={{ gridColumn: 'span 2' }}>
                <span>Serial number <span style={{ color: '#ef4444' }}>*</span></span>
                <input
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </label>

              <label>
                <span>Installation Date <span style={{ color: '#ef4444' }}>*</span></span>
                <input
                  type="date"
                  required
                  value={installedAt}
                  onChange={(e) => handleInstalledAtChange(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                  Date installed on customer
                </span>
              </label>

              <label>
                <span>Expiration Date <span style={{ color: '#ef4444' }}>*</span></span>
                <input
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, marginTop: '2px' }}>
                  Auto-calculated (15 days)
                </span>
              </label>

              {/* Modern Customer Combobox Picker */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                    Link to Customer <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional)</span>
                  </span>
                  {selectedCustomer && (
                    <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={12} /> Customer selected
                    </span>
                  )}
                </div>

                {selectedCustomer ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f0fdfa',
                      border: '1.5px solid #0f766e',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(15, 118, 110, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: '#ccfbf1',
                          color: '#0f766e',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {[selectedCustomer.firstName?.[0], selectedCustomer.lastName?.[0]].filter(Boolean).join('') || 'C'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 600 }}>
                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </strong>
                          <span className="id-badge">
                            {selectedCustomer.customerNumber}
                          </span>
                        </div>
                        {(selectedCustomer.phone || selectedCustomer.email) && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearchQuery('');
                        setIsDropdownOpen(true);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: '#475569',
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#475569';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <X size={13} /> Change
                    </button>
                  </div>
                ) : (
                  <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Search
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          color: isDropdownOpen ? '#0f766e' : '#94a3b8',
                          pointerEvents: 'none',
                          transition: 'color 0.2s',
                        }}
                      />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Search and select customer (or leave unassigned)..."
                        style={{
                          width: '100%',
                          height: '40px',
                          paddingLeft: '36px',
                          paddingRight: customerSearchQuery ? '32px' : '14px',
                          fontSize: '13px',
                          borderRadius: '7px',
                          border: isDropdownOpen ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                          outline: 'none',
                          boxShadow: isDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.1)' : 'none',
                          transition: 'all 0.2s',
                          background: '#ffffff',
                        }}
                      />
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {isDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                          maxHeight: '250px',
                          overflowY: 'auto',
                        }}
                        className="custom-scrollbar"
                      >
                        <div
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerSearchQuery('');
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderBottom: '1px solid #f1f5f9',
                            background: '#fafafa',
                            color: '#64748b',
                            fontSize: '12.5px',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fafafa')}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                              fontSize: '11px',
                            }}
                          >
                            —
                          </div>
                          <span>None — Keep sensor as unassigned inventory</span>
                        </div>

                        {loading ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                            Loading customer directory...
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                            No customers found matching "{customerSearchQuery}"
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const initials = [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'C';
                            return (
                              <div
                                key={c._id}
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerSearchQuery('');
                                  setIsDropdownOpen(false);
                                }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderBottom: '1px solid #f8fafc',
                                  transition: 'background 0.12s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdfa')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: '#e0f2fe',
                                      color: '#0369a1',
                                      fontWeight: 700,
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                                      {c.firstName} {c.lastName}
                                    </div>
                                    {(c.phone || c.email) && (
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                                        {[c.phone, c.email].filter(Boolean).join(' • ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="id-badge">
                                  {c.customerNumber}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="form-error" style={{ marginTop: '16px', marginBottom: '8px' }}>{error}</div>
            )}

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <Link className="secondary-button" href="/sensors">Cancel</Link>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <><Check size={16} /> Save sensor</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
