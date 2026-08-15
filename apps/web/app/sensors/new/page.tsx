'use client';

import { Check, ChevronDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function NewSensorPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [sensorTypes, setSensorTypes] = useState<SensorTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  
  const [serialNumber, setSerialNumber] = useState('');
  const [sensorTypeId, setSensorTypeId] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          manufacturer: manufacturer.trim() || 'Unknown',
          model: model.trim() || 'Unknown',
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date('2028-12-31').toISOString(),
        }),
      });

      if (customerId && createdSensor?._id) {
        await apiFetch(`/sensors/${createdSensor._id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ customerId }),
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
                Manufacturer
                <input
                  placeholder="e.g. Abbott, Dexcom, Philips"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </label>

              <label>
                Model
                <input
                  placeholder="e.g. FreeStyle Libre 3"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
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

              <label>
                Link to customer (optional)
                <div className="select-wrap">
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">None — keep as unassigned inventory</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName} ({c.customerNumber})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
              </label>
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
