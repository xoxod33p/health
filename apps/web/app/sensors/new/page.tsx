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

type SensorTypeItem = {
  _id: string;
  name: string;
  code: string;
  status: string;
};

function getDefaultExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewSensorPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [sensorTypes, setSensorTypes] = useState<SensorTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [serialNumber, setSerialNumber] = useState('');
  const [sensorTypeId, setSensorTypeId] = useState('');
  const [expiresAt, setExpiresAt] = useState(getDefaultExpiryDate);
  const [customerId, setCustomerId] = useState('');
  const [installedAt, setInstalledAt] = useState(getTodayDate);
  const [customerQuery, setCustomerQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.customerNumber}`.toLowerCase().includes(q)
    );
  }, [customers, customerQuery]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [cRes, stRes] = await Promise.all([
          apiFetch<CustomerResponse>('/customers?limit=100').catch(() => ({ data: [] })),
          apiFetch<SensorTypeItem[]>('/sensor-types').catch(() => []),
        ]);
        if (mounted) {
          setCustomers(cRes.data || []);
          const activeTypes = Array.isArray(stRes) ? stRes.filter((t) => t.status === 'ACTIVE') : [];
          setSensorTypes(activeTypes);
          if (activeTypes.length > 0 && activeTypes[0]?._id) {
            setSensorTypeId(activeTypes[0]._id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadData();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serialNumber) return;

    setSaving(true);
    setError('');

    try {
      const createdSensor = await apiFetch<{ _id: string }>('/sensors', {
        method: 'POST',
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          sensorTypeId: sensorTypeId || 'default',
          expiresAt: expiresAt
            ? new Date(expiresAt).toISOString()
            : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      if (customerId && createdSensor?._id) {
        await apiFetch(`/sensors/${createdSensor._id}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            customerId,
            installedAt: installedAt ? new Date(installedAt).toISOString() : new Date().toISOString(),
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
        <section className="panel" style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 22px' }}>
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <p className="eyebrow">Hardware telemetry register</p>
              <h2>Add New Sensor</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Serial number <span style={{ color: '#ef4444' }}>*</span>
                <input
                  required
                  placeholder="e.g. CGM-44105 or ECG-88902"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </label>

              <label>
                Sensor type
                <div className="select-wrap">
                  <select
                    value={sensorTypeId}
                    onChange={(e) => setSensorTypeId(e.target.value)}
                    disabled={loading}
                  >
                    {loading ? (
                      <option value="">Loading...</option>
                    ) : sensorTypes.length === 0 ? (
                      <option value="">No types defined</option>
                    ) : (
                      sensorTypes.map((st) => (
                        <option key={st._id} value={st._id}>
                          {st.name} ({st.code})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={15} />
                </div>
              </label>

              <label>
                Expiration date <span style={{ color: '#ef4444' }}>*</span>
                <input
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ margin: 0, fontWeight: 500 }}>
                    Link to customer (optional)
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

                {customerId && (
                  <label style={{ marginTop: '8px' }}>
                    Installation Date
                    <input
                      type="date"
                      value={installedAt}
                      onChange={(e) => setInstalledAt(e.target.value)}
                    />
                  </label>
                )}
              </div>
            </div>

            {error && (
              <div className="form-error" style={{ marginTop: '16px', marginBottom: '8px' }}>{error}</div>
            )}

            <div className="form-actions">
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
