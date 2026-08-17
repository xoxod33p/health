'use client';

import {
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';

type SensorType = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
};

export default function SensorTypesPage() {
  const [types, setTypes] = useState<SensorType[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SensorType | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<SensorType[]>('/sensor-types');
      setTypes(Array.isArray(data) ? data : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load sensor types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => types.filter((t) =>
      `${t.name} ${t.code} ${t.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
    ),
    [types, query]
  );

  const resetCreate = () => {
    setCreateName(''); setCreateCode(''); setCreateDesc(''); setCreateError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError('');
    try {
      await apiFetch('/sensor-types', {
        method: 'POST',
        body: JSON.stringify({ name: createName.trim(), code: createCode.trim(), description: createDesc.trim() || undefined }),
      });
      setCreateOpen(false);
      resetCreate();
      await load();
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : 'Failed to create sensor type');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEdit = (t: SensorType) => {
    setEditTarget(t);
    setEditName(t.name);
    setEditCode(t.code);
    setEditDesc(t.description ?? '');
    setEditStatus(t.status);
    setEditError('');
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      await apiFetch(`/sensor-types/${editTarget._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), code: editCode.trim(), description: editDesc.trim() || undefined, status: editStatus }),
      });
      setEditOpen(false);
      setEditTarget(null);
      await load();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : 'Failed to update sensor type');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete sensor type "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/sensor-types/${id}`, { method: 'DELETE' });
      await load();
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Failed to delete sensor type');
    }
  };

  return (
    <AppShell>
      <div className="page-content">

        
        <section className="mini-stat-grid mini-stat-grid-3">
          <div className="mini-stat">
            <div className="mini-stat-top"><span>Total types</span><Tag size={18} /></div>
            <strong>{types.length}</strong>
            <small>Registered types</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <div className="mini-stat-top"><span>Active</span><Tag size={18} /></div>
            <strong>{types.filter((t) => t.status === 'ACTIVE').length}</strong>
            <small>In use</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top"><span>Inactive</span><Tag size={18} /></div>
            <strong>{types.filter((t) => t.status === 'INACTIVE').length}</strong>
            <small>Disabled</small>
          </div>
        </section>

        {loading && <div className="data-loading"><RefreshCw size={18} className="spin" /> Loading sensor types...</div>}
        {error && <div className="data-error"><span>{error}</span><button className="secondary-button" onClick={() => void load()}>Try again</button></div>}

        {!loading && !error && (
          <section className="panel">
            <div className="panel-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow">Type registry</p>
                <h2>Sensor Types</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div className="search-field" style={{ width: '250px', maxWidth: '100%' }}>
                  <Search size={16} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search types..." />
                </div>
                <span className="result-count">{filtered.length} types</span>
                <button className="primary-button" onClick={() => { resetCreate(); setCreateOpen(true); }} style={{ padding: '7px 14px', fontSize: '13px' }}>
                  <Plus size={15} /> New sensor type
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No sensor types yet</h2>
                <p>Create your first sensor type to categorise devices in the inventory.</p>
              </div>
            ) : (
              <div
                className="table-wrap custom-scrollbar"
                style={{
                  maxHeight: 'calc(100vh - 280px)',
                  minHeight: '300px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  borderRadius: '6px',
                  border: '1px solid #edf1f1',
                }}
              >
                <table className="rich-table">
                  <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                    <tr>
                      <th style={{ background: '#ffffff' }}>Name</th>
                      <th style={{ background: '#ffffff' }}>Code</th>
                      <th style={{ background: '#ffffff' }}>Description</th>
                      <th style={{ background: '#ffffff' }}>Status</th>
                      <th style={{ background: '#ffffff' }}>Created</th>
                      <th style={{ textAlign: 'right', background: '#ffffff' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0efeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Tag size={15} style={{ color: '#0f766e' }} />
                            </div>
                            <strong>{t.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#334155' }}>
                            {t.code}
                          </span>
                        </td>
                        <td className="muted-cell" style={{ fontSize: '13px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description ?? '—'}
                        </td>
                        <td>
                          <span className={`status ${t.status === 'ACTIVE' ? 'status-healthy' : 'status-critical'}`}>
                            <i />{t.status}
                          </span>
                        </td>
                        <td className="muted-cell">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openEdit(t)}
                              style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => void handleDelete(t._id, t.name)}
                              style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: '#fecaca' }}
                            >
                              <Trash2 size={12} /> Delete
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

        
        {createOpen && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '460px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>New Sensor Type</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Define a new category for sensor devices</p>
                </div>
                <button className="icon-button" type="button" onClick={() => { setCreateOpen(false); resetCreate(); }}><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label>
                    Name <span style={{ color: '#ef4444' }}>*</span>
                    <input required value={createName} onChange={(e) => setCreateName(e.target.value)} />
                  </label>
                  <label>
                    Code <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                      style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', display: 'block' }}>Short unique identifier, auto-uppercased</small>
                  </label>
                  <label>
                    Description (optional)
                    <textarea
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                </div>
                {createError && <div className="form-error" style={{ marginTop: '12px' }}>{createError}</div>}
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button className="secondary-button" type="button" onClick={() => { setCreateOpen(false); resetCreate(); }}>Cancel</button>
                  <button className="primary-button" type="submit" disabled={createSubmitting}>
                    {createSubmitting ? <RefreshCw size={16} className="spin" /> : <><Plus size={14} /> Create type</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {editOpen && editTarget && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '460px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Edit Sensor Type</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{editTarget.name} ({editTarget.code})</p>
                </div>
                <button className="icon-button" type="button" onClick={() => setEditOpen(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleEdit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label>
                    Name <span style={{ color: '#ef4444' }}>*</span>
                    <input required value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </label>
                  <label>
                    Code <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                      style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                    />
                  </label>
                  <label>
                    Description (optional)
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
                  </label>
                  <label>
                    Status
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </label>
                </div>
                {editError && <div className="form-error" style={{ marginTop: '12px' }}>{editError}</div>}
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button className="secondary-button" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
                  <button className="primary-button" type="submit" disabled={editSubmitting}>
                    {editSubmitting ? <RefreshCw size={16} className="spin" /> : 'Save changes'}
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
