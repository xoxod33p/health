'use client';

import { Boxes, Link2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';

const initialSensors = [
  { serial: 'VS-2048-AX', type: 'VitalSense Pro', customer: 'Mara Ellison', expires: 'Aug 12, 2026', status: 'Expiring soon', tone: 'warning' },
  { serial: 'CG-9912-KL', type: 'CardioGuard 2', customer: 'Riverside Care', expires: 'Aug 15, 2026', status: 'Expiring soon', tone: 'warning' },
  { serial: 'VS-1980-QB', type: 'VitalSense Pro', customer: 'Jon Bell', expires: 'Aug 19, 2026', status: 'Active', tone: 'healthy' },
  { serial: 'OX-8830-TR', type: 'OxiTrack Mini', customer: 'Northstar Clinic', expires: 'Sep 02, 2026', status: 'Active', tone: 'healthy' },
  { serial: 'CG-7702-RN', type: 'CardioGuard 2', customer: 'Available inventory', expires: 'Nov 21, 2026', status: 'Available', tone: 'available' },
];

export default function SensorsPage() {
  const [sensors, setSensors] = useState(initialSensors);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [showAdd, setShowAdd] = useState(false);
  const filtered = useMemo(() => sensors.filter((sensor) => (status === 'All statuses' || sensor.status === status) && `${sensor.serial} ${sensor.type} ${sensor.customer}`.toLowerCase().includes(query.toLowerCase())), [sensors, query, status]);
  const addSensor = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const serial = String(form.get('serial') ?? '').trim(); if (!serial) return; setSensors([{ serial, type: String(form.get('type') ?? 'VitalSense Pro'), customer: 'Available inventory', expires: String(form.get('expires') ?? 'Dec 31, 2026'), status: 'Available', tone: 'available' }, ...sensors]); setShowAdd(false); };

  return <AppShell><div className="page-content"><section className="page-heading"><div><p className="eyebrow">Device inventory</p><h1>Sensors</h1><p className="heading-copy">Track availability, assignments, and expiration risk.</p></div><Link className="primary-button" href="/sensors/new"><Plus size={17} /> Add sensor</Link></section>
    <section className="mini-stat-grid"><div className="mini-stat"><Boxes size={19} /><span>All sensors</span><strong>{sensors.length}</strong></div><div className="mini-stat mini-stat-teal"><span>Active</span><strong>2,418</strong><small>65.8% of inventory</small></div><div className="mini-stat mini-stat-amber"><span>Expiring soon</span><strong>84</strong><small>17 critical this week</small></div><div className="mini-stat mini-stat-blue"><span>Available</span><strong>736</strong><small>Ready to assign</small></div></section>
    <section className="toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search serial, type, or customer" /></div><select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Active</option><option>Expiring soon</option><option>Available</option></select><button className="filter-button"><SlidersHorizontal size={16} /> More filters</button><span className="result-count">{filtered.length} shown</span></section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Inventory register</p><h2>All sensors</h2></div><button className="ghost-button" onClick={() => setShowAdd(true)}><Link2 size={14} /> Assign sensor</button></div><div className="table-wrap"><table className="rich-table"><thead><tr><th>Serial number</th><th>Sensor type</th><th>Customer</th><th>Expires</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((sensor) => <tr key={sensor.serial}><td><strong className="serial">{sensor.serial}</strong></td><td>{sensor.type}</td><td>{sensor.customer}</td><td className={sensor.tone === 'warning' ? 'attention-text' : ''}>{sensor.expires}</td><td><span className={`status status-${sensor.tone}`}><i />{sensor.status}</span></td><td><button className="row-link">Details</button></td></tr>)}</tbody></table></div></section>
    {showAdd && <div className="modal-backdrop"><form className="modal-card" onSubmit={addSensor}><div className="modal-heading"><div><p className="eyebrow">Inventory</p><h2>Add sensor</h2></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close dialog">×</button></div><label>Serial number<input name="serial" autoFocus placeholder="e.g. VS-3001-NX" required /></label><label>Sensor type<select name="type"><option>VitalSense Pro</option><option>CardioGuard 2</option><option>OxiTrack Mini</option></select></label><label>Expiration date<input name="expires" type="date" required /></label><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button">Save sensor</button></div></form></div>}
  </div></AppShell>;
}
