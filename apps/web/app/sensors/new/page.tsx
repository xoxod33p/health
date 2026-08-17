'use client';

import { Check, ChevronDown, RefreshCw, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiFetch } from '../../../lib/api';

type CustomerItem = {
  _id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
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
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleInstalledAtChange = (newDate: string) => {
    setInstalledAt(newDate);
    if (newDate) {
      setExpiresAt(addDaysToDateString(newDate, 15));
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.customerNumber}`.toLowerCase().includes(q)
    );
  }, [customers, customerQuery]);

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
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serialNumber) return;

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

      if (customerId && createdSensor?._id) {
        await apiFetch(`/sensors/${createdSensor._id}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            customerId,
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
        <section className="panel" style={{ maxWidth: '680px', margin: '0 auto', padding: '22px 24px' }}>
          <div className="panel-heading" style={{ marginBottom: '18px' }}>
            <div>
              <p className="eyebrow">Hardware telemetry register</p>
              <h2>Add New Sensor</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label style={{ gridColumn: 'span 2' }}>
                Serial number <span style={{ color: '#ef4444' }}>*</span>
                <input
                  required
                  placeholder="e.g. CGM-44105 or ECG-88902"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </label>

              <label>
                Installation Date <span style={{ color: '#ef4444' }}>*</span>
                <input
                  type="date"
                  required
                  value={installedAt}
                  onChange={(e) => handleInstalledAtChange(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Date installed on customer
                </span>
              </label>

              <label>
                Expiration Date <span style={{ color: '#ef4444' }}>*</span>
                <input
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 500, marginTop: '3px', display: 'block' }}>
                  Auto-calculated (15 days from installation)
                </span>
              </label>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ margin: 0, fontWeight: 500 }}>
                    Link to Customer (optional)
                  </label>
                  {customerQuery && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {filteredCustomers.length} {filteredCustomers.length === 1 ? 'match' : 'matches'}
                    </span>
                  )}
                </div>

                <div className="search-field" style={{ width: '100%', maxWidth: '100%', position: 'relative' }}>
                  <Search size={15} />
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search customer name or ID..."
                    style={{ height: '36px', fontSize: '13px', width: '100%', paddingRight: customerQuery ? '28px' : '10px' }}
                  />
                  {customerQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerQuery('')}
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

                <div className="select-wrap" style={{ marginTop: '2px' }}>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">None — keep as unassigned inventory</option>
                    {filteredCustomers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName} ({c.customerNumber})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>

            {error && (
              <div className="form-error" style={{ marginTop: '16px', marginBottom: '8px' }}>{error}</div>
            )}

            <div className="form-actions" style={{ marginTop: '20px' }}>
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
