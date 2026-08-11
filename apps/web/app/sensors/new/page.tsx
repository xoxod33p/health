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
};

export default function NewSensorPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [sensorTypes, setSensorTypes] = useState<SensorTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [serialNumber, setSerialNumber] = useState('');
  const [sensorTypeId, setSensorTypeId] = useState('');
  const [manufacturer, setManufacturer] = useState('CareSignal Labs');
  const [model, setModel] = useState('CS-100');
  const [expiresAt, setExpiresAt] = useState('2028-12-31');
  const [customerId, setCustomerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [cRes, stRes] = await Promise.all([
          apiFetch<CustomerResponse>('/customers?limit=100').catch(() => ({ data: [] })),
          apiFetch<SensorTypeItem[]>('/sensors/types').catch(() => []),
        ]);
        if (mounted) {
          setCustomers(cRes.data || []);
          setSensorTypes(Array.isArray(stRes) ? stRes : []);
          if (stRes.length > 0 && stRes[0]?._id) {
            setSensorTypeId(stRes[0]._id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serialNumber) return;

    setSaving(true);
    setError('');

    try {
      // 1. Create the Sensor
      const createdSensor = await apiFetch<{ _id: string }>('/sensors', {
        method: 'POST',
        body: JSON.stringify({
          serialNumber: serialNumber.trim(),
          sensorTypeId: sensorTypeId || 'vitalsense_pro',
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date('2028-12-31').toISOString(),
        }),
      });

      // 2. If Customer is selected, assign sensor to customer immediately
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
      <div className="page-content narrow-content" style={{ paddingTop: '16px' }}>
        <div className="form-layout">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="form-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <div className="form-grid">
                <label>
                  Serial number
                  <input
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-8840-X"
                  />
                </label>

                <label>
                  Sensor type
                  <div className="select-wrap">
                    <select
                      value={sensorTypeId}
                      onChange={(e) => setSensorTypeId(e.target.value)}
                    >
                      <option value="">Default (VitalSense Pro)</option>
                      {sensorTypes.map((st) => (
                        <option key={st._id} value={st._id}>
                          {st.name} ({st.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </label>

                <label>
                  Manufacturer
                  <input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. CareSignal Labs"
                  />
                </label>

                <label>
                  Model
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. VS-200"
                  />
                </label>

                <label>
                  Expiration date
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
                      <option value="">None (Keep as unassigned inventory)</option>
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
                <div className="form-error" style={{ marginTop: '16px' }}>
                  {error}
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Link className="ghost-button" href="/sensors">
                Cancel
              </Link>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <>
                    <Check size={16} /> Save sensor
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="form-aside">
            <div className="aside-number">01</div>
            <strong>Register & Link</strong>
            <p>You can link a sensor directly to a customer now or assign it later from inventory.</p>
            <div className="aside-number">02</div>
            <strong>Audit log</strong>
            <p>Every sensor registration and customer assignment is permanently logged for compliance.</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
