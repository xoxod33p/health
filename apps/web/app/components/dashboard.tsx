'use client';

import { CircleAlert, MoreHorizontal, Plus } from 'lucide-react';
import Link from 'next/link';

const metrics = [
  { label: 'Active customers', value: '1,248', delta: '+8.4%', note: 'vs. last month', tone: 'teal' },
  { label: 'Sensors in service', value: '3,672', delta: '+12.1%', note: 'vs. last month', tone: 'blue' },
  { label: 'Expiring in 30 days', value: '84', delta: 'Needs attention', note: '17 critical', tone: 'amber' },
  { label: 'Unread notifications', value: '12', delta: '4 high priority', note: 'Review inbox', tone: 'coral' },
];
const sensorRows = [
  { serial: 'VS-2048-AX', customer: 'Mara Ellison', type: 'VitalSense Pro', expires: 'Tomorrow', status: 'Critical', tone: 'critical' },
  { serial: 'CG-9912-KL', customer: 'Riverside Care', type: 'CardioGuard 2', expires: 'In 4 days', status: 'Expiring', tone: 'warning' },
  { serial: 'VS-1980-QB', customer: 'Jon Bell', type: 'VitalSense Pro', expires: 'In 8 days', status: 'Expiring', tone: 'warning' },
  { serial: 'OX-8830-TR', customer: 'Northstar Clinic', type: 'OxiTrack Mini', expires: 'In 12 days', status: 'Monitoring', tone: 'healthy' },
];

export function Dashboard() {
  return <div className="page-content">
    <section className="page-heading"><div><p className="eyebrow">Tuesday, August 11, 2026</p><h1>Good morning, Olivia</h1><p className="heading-copy">Here&apos;s what&apos;s happening across your care network today.</p></div><Link className="primary-button" href="/sensors/new"><Plus size={17} /> Add sensor</Link></section>
    <section className="metric-grid" aria-label="Workspace summary">{metrics.map((metric) => <article className={`metric-card metric-${metric.tone}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><MoreHorizontal size={17} /></div><strong>{metric.value}</strong><div className="metric-bottom"><b>{metric.delta}</b><span>{metric.note}</span></div></article>)}</section>
    <section className="attention-banner"><div className="attention-icon"><CircleAlert size={21} /></div><div><strong>17 sensors need immediate attention</strong><span>Expiration windows are closing this week. Review the queue to avoid gaps in coverage.</span></div><Link className="text-button" href="/sensors?status=expiring">Review sensors <span>→</span></Link></section>
    <div className="dashboard-grid"><section className="panel expiration-panel"><div className="panel-heading"><div><p className="eyebrow">Priority queue</p><h2>Expiration watchlist</h2></div><Link className="ghost-button" href="/sensors?status=expiring">View all <span>→</span></Link></div><div className="table-wrap"><table><thead><tr><th>Sensor</th><th>Customer</th><th>Type</th><th>Expires</th><th>Status</th></tr></thead><tbody>{sensorRows.map((row) => <tr key={row.serial}><td><strong className="serial">{row.serial}</strong></td><td>{row.customer}</td><td className="muted-cell">{row.type}</td><td>{row.expires}</td><td><span className={`status status-${row.tone}`}><i />{row.status}</span></td></tr>)}</tbody></table></div></section><section className="panel status-panel"><div className="panel-heading"><div><p className="eyebrow">Live inventory</p><h2>Sensor status</h2></div><MoreHorizontal size={18} /></div><div className="donut-wrap"><div className="donut"><div><strong>3,672</strong><span>Total sensors</span></div></div><div className="legend"><span><i className="dot dot-teal" />Active <b>2,418</b></span><span><i className="dot dot-blue" />Available <b>736</b></span><span><i className="dot dot-amber" />Expiring <b>84</b></span><span><i className="dot dot-gray" />Other <b>434</b></span></div></div></section></div>
    <section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">Audit trail</p><h2>Recent activity</h2></div><Link className="ghost-button" href="/audit">Open audit log <span>→</span></Link></div><div className="activity-list"><div className="activity-row"><div className="activity-avatar activity-blue">AM</div><div className="activity-copy"><strong>Aisha Morgan</strong><span>assigned sensor <b>VS-2280-LP</b></span></div><time>12 min ago</time><MoreHorizontal size={17} /></div><div className="activity-row"><div className="activity-avatar activity-green">JT</div><div className="activity-copy"><strong>Jordan Tate</strong><span>updated customer record <b>Mara Ellison</b></span></div><time>34 min ago</time><MoreHorizontal size={17} /></div><div className="activity-row"><div className="activity-avatar activity-gold">RK</div><div className="activity-copy"><strong>Ravi Khatri</strong><span>exported expiration report <b>April 2026</b></span></div><time>1 hr ago</time><MoreHorizontal size={17} /></div></div></section>
    <footer className="page-footer"><span>CareSignal platform</span><span>Last synced just now</span><a href="http://localhost:3001/api/v1/health">API status <i /></a></footer>
  </div>;
}
