'use client';

import { Boxes, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type Sensor = { _id: string; serialNumber: string; sensorTypeId: string; customerId?: string; status: string; expiresAt: string };
type SensorResponse = { data: Sensor[]; total: number };

export default function SensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<SensorResponse>('/sensors?limit=100');
      setSensors(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load sensors');
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

  const filtered = useMemo(
    () =>
      sensors.filter(
        (sensor) =>
          (status === 'All statuses' || sensor.status === status) &&
          `${sensor.serialNumber} ${sensor.sensorTypeId} ${sensor.customerId ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [sensors, query, status]
  );

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search serial, type, or customer"
        />
      </div>
      <select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option>All statuses</option>
        <option>ACTIVE</option>
        <option>ASSIGNED</option>
        <option>EXPIRING_SOON</option>
        <option>EXPIRED</option>
        <option>AVAILABLE</option>
        <option>DISABLED</option>
      </select>
      <button className="filter-button">
        <SlidersHorizontal size={16} /> More filters
      </button>
      <span className="result-count">{filtered.length} loaded</span>
    </div>
  );

  const topbarRight = (
    <Link className="primary-button" href="/sensors/new">
      <Plus size={17} /> Add sensor
    </Link>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">
        <section className="mini-stat-grid">
          <div className="mini-stat">
            <Boxes size={19} />
            <span>Loaded sensors</span>
            <strong>{sensors.length}</strong>
            <small>From API</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <span>Active</span>
            <strong>{sensors.filter((sensor) => sensor.status === 'ACTIVE').length}</strong>
            <small>Current records</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <span>Expiring soon</span>
            <strong>{sensors.filter((sensor) => sensor.status === 'EXPIRING_SOON').length}</strong>
            <small>Current page</small>
          </div>
          <div className="mini-stat mini-stat-blue">
            <span>Available</span>
            <strong>{sensors.filter((sensor) => sensor.status === 'AVAILABLE').length}</strong>
            <small>Current page</small>
          </div>
        </section>

        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading sensors...
          </div>
        )}

        {error && (
          <div className="data-error">
            <span>{error}</span>
            <button className="secondary-button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Inventory register</p>
                <h2>All sensors</h2>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No sensor records</h2>
                <p>Add the first device to this workspace.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>Serial number</th>
                      <th>Sensor type</th>
                      <th>Customer ID</th>
                      <th>Expires</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((sensor) => (
                      <tr key={sensor._id}>
                        <td>
                          <strong className="serial">{sensor.serialNumber}</strong>
                        </td>
                        <td>{sensor.sensorTypeId}</td>
                        <td className="muted-cell">{sensor.customerId ?? 'Unassigned'}</td>
                        <td>{new Date(sensor.expiresAt).toLocaleDateString()}</td>
                        <td>
                          <span className="status status-healthy">
                            <i />
                            {sensor.status}
                          </span>
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
