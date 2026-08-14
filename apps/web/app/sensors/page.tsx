'use client';

import {
  Activity,
  AlertTriangle,
  Boxes,
  Clock,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type Sensor = {
  _id: string;
  serialNumber: string;
  sensorTypeId: string;
  customerId?: string;
  status: string;
  expiresAt: string;
};
type SensorResponse = { data: Sensor[]; total: number };

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

export default function SensorsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'replacements'>('inventory');

  // Inventory state
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Replacement log state
  const [replacements, setReplacements] = useState<SensorReplacement[]>([]);
  const [replQuery, setReplQuery] = useState('');
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [replacementsError, setReplacementsError] = useState('');

  // Log Replacement modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [formIssue, setFormIssue] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const loadSensors = async () => {
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
    void connectRealtime(() => { void loadSensors(); void loadReplacements(); }).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  const filteredSensors = useMemo(
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

  const filteredReplacements = useMemo(
    () =>
      replacements.filter((r) =>
        `${r.customerName} ${r.serialNumber} ${r.issueType}`
          .toLowerCase()
          .includes(replQuery.toLowerCase())
      ),
    [replacements, replQuery]
  );

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

  const topbarCenter = (
    <div className="topbar-center-wrap">
      {activeTab === 'inventory' ? (
        <>
          <div className="search-field">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search serial, type, or customer" />
          </div>
          <select className="select-control" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All statuses</option>
            <option>ACTIVE</option>
            <option>ASSIGNED</option>
            <option>EXPIRING_SOON</option>
            <option>EXPIRED</option>
            <option>AVAILABLE</option>
            <option>DISABLED</option>
            <option>REPLACED</option>
          </select>
          <button className="filter-button"><SlidersHorizontal size={16} /> More filters</button>
          <span className="result-count">{filteredSensors.length} loaded</span>
        </>
      ) : (
        <>
          <div className="search-field">
            <Search size={16} />
            <input value={replQuery} onChange={(e) => setReplQuery(e.target.value)} placeholder="Search customer, serial or issue..." />
          </div>
          <span className="result-count">{filteredReplacements.length} records</span>
        </>
      )}
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
          <button
            type="button"
            className={activeTab === 'inventory' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('inventory')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Boxes size={16} /> Sensor Inventory ({sensors.length})
          </button>
          <button
            type="button"
            className={activeTab === 'replacements' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('replacements')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', ...(activeTab !== 'replacements' && replacements.length > 0 ? { borderColor: '#fde68a', color: '#d97706' } : {}) }}
          >
            <AlertTriangle size={16} /> Replacement Log ({replacements.length})
          </button>
        </div>

        {/* Stats */}
        <section className="mini-stat-grid">
          <div className="mini-stat">
            <div className="mini-stat-top"><span>Total sensors</span><Boxes size={18} /></div>
            <strong>{sensors.length}</strong>
            <small>In inventory</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <div className="mini-stat-top"><span>Active</span><Activity size={18} /></div>
            <strong>{sensors.filter((s) => s.status === 'ACTIVE').length}</strong>
            <small>Currently active</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top"><span>Expiring soon</span><Clock size={18} /></div>
            <strong>{sensors.filter((s) => s.status === 'EXPIRING_SOON').length}</strong>
            <small>Needs attention</small>
          </div>
          <div className="mini-stat mini-stat-blue">
            <div className="mini-stat-top"><span>Replacements logged</span><AlertTriangle size={18} /></div>
            <strong>{replacements.length}</strong>
            <small>Total issue records</small>
          </div>
        </section>

        {/* ── Inventory Tab ── */}
        {activeTab === 'inventory' && (
          <>
            {loading && <div className="data-loading"><RefreshCw size={18} className="spin" /> Loading sensors...</div>}
            {error && <div className="data-error"><span>{error}</span><button className="secondary-button" onClick={() => void loadSensors()}>Try again</button></div>}
            {!loading && !error && (
              <section className="panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">Inventory register</p><h2>All sensors</h2></div>
                </div>
                {filteredSensors.length === 0 ? (
                  <div className="empty-panel"><h2>No sensor records</h2><p>Add the first device to this workspace.</p></div>
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
                        {filteredSensors.map((sensor) => (
                          <tr key={sensor._id}>
                            <td><strong className="serial">{sensor.serialNumber}</strong></td>
                            <td>{sensor.sensorTypeId}</td>
                            <td className="muted-cell">{sensor.customerId ?? 'Unassigned'}</td>
                            <td>{new Date(sensor.expiresAt).toLocaleDateString()}</td>
                            <td>
                              <span className={`status ${sensor.status === 'ACTIVE' || sensor.status === 'ASSIGNED' ? 'status-healthy' : sensor.status === 'EXPIRING_SOON' ? 'status-warning' : sensor.status === 'EXPIRED' || sensor.status === 'DISABLED' || sensor.status === 'REPLACED' ? 'status-critical' : 'status-healthy'}`}>
                                <i />{sensor.status}
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
          </>
        )}

        {/* ── Replacement Log Tab ── */}
        {activeTab === 'replacements' && (
          <>
            {replacementsLoading && <div className="data-loading"><RefreshCw size={18} className="spin" /> Loading replacement log...</div>}
            {replacementsError && <div className="data-error"><span>{replacementsError}</span><button className="secondary-button" onClick={() => void loadReplacements()}>Try again</button></div>}
            {!replacementsLoading && !replacementsError && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Issue & Replacement Log</p>
                    <h2>Sensor Replacement Records</h2>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#d97706', borderColor: '#d97706' }}
                  >
                    <Plus size={16} /> Log replacement
                  </button>
                </div>
                {filteredReplacements.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No replacement records</h2>
                    <p>Use the &quot;Log Replacement&quot; button to record a sensor issue or replacement.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="rich-table">
                      <thead>
                        <tr>
                          <th>Customer Name</th>
                          <th>Serial Number</th>
                          <th>Replaced Date</th>
                          <th>Issue Type</th>
                          <th>Notes</th>
                          <th>Logged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReplacements.map((r) => (
                          <tr key={r._id}>
                            <td><strong>{r.customerName}</strong></td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0f766e', background: '#f0fdf4', padding: '2px 8px', borderRadius: '4px' }}>
                                {r.serialNumber}
                              </span>
                            </td>
                            <td>{new Date(r.replacedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 500, fontSize: '13px' }}>
                                <AlertTriangle size={13} />
                                {r.issueType}
                              </span>
                            </td>
                            <td className="muted-cell" style={{ fontSize: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes ?? '—'}</td>
                            <td className="muted-cell">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
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

        {/* ── Log Replacement Modal ── */}
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '500px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Log Sensor Replacement</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Record a sensor issue or replacement by customer and serial number.</p>
                </div>
                <button className="icon-button" type="button" onClick={() => setModalOpen(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleLogReplacement}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label>
                    Customer Name <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                    />
                  </label>
                  <label>
                    Serial Number (X Serial Num) <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value.toUpperCase())}
                      style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                    />
                  </label>
                  <label>
                    Replaced Date <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Issue Type <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={formIssue}
                      onChange={(e) => setFormIssue(e.target.value)}
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                      Describe the specific hardware issue or maintenance reason
                    </small>
                  </label>
                  <label>
                    Notes (optional)
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                </div>
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={submitting}
                    style={{ background: '#d97706', borderColor: '#d97706' }}
                  >
                    {submitting ? <RefreshCw size={16} className="spin" /> : <><AlertTriangle size={14} /> Save record</>}
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
