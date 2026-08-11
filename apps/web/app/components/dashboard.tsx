'use client';

import { CircleAlert, MoreHorizontal, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type DashboardSummary = { totalCustomers: number; activeCustomers: number; totalSensors: number; activeSensors: number; expiringSensors: number; expiredSensors: number; unreadNotifications: number };
type Sensor = { _id: string; serialNumber: string; sensorTypeId: string; customerId?: string; status: string; expiresAt: string };
type SensorResponse = { data: Sensor[]; total: number };

function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
function daysRemaining(value: string) { return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000); }

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const [nextSummary, nextSensors] = await Promise.all([apiFetch<DashboardSummary>('/dashboard/summary'), apiFetch<SensorResponse>('/sensors?limit=4')]); setSummary(nextSummary); setSensors(nextSensors.data); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load dashboard data'); } finally { setLoading(false); } };
  useEffect(() => { void load(); let disconnect: (() => void) | undefined; void connectRealtime(() => void load()).then((cleanup) => { disconnect = cleanup; }); return () => disconnect?.(); }, []);
  if (loading) return <div className="page-content"><div className="data-loading"><RefreshCw size={18} className="spin" />Loading live workspace data...</div></div>;
  if (error) return <div className="page-content"><div className="data-error"><CircleAlert size={20} /><div><strong>Dashboard data unavailable</strong><span>{error}</span></div><button className="secondary-button" onClick={() => void load()}>Try again</button></div></div>;
  if (!summary) return null;
  const metrics = [{ label: 'Active customers', value: summary.activeCustomers, delta: `${summary.totalCustomers} total`, note: 'From customer records', tone: 'teal' }, { label: 'Sensors in service', value: summary.activeSensors, delta: `${summary.totalSensors} total`, note: 'Active or assigned', tone: 'blue' }, { label: 'Expiring in 30 days', value: summary.expiringSensors, delta: `${summary.expiredSensors} expired`, note: 'Requires attention', tone: 'amber' }, { label: 'Unread notifications', value: summary.unreadNotifications, delta: 'Live inbox', note: 'For your account', tone: 'coral' }];
  return <div className="page-content"><section className="metric-grid" aria-label="Workspace summary">{metrics.map((metric) => <article className={`metric-card metric-${metric.tone}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><MoreHorizontal size={17} /></div><strong>{metric.value.toLocaleString()}</strong><div className="metric-bottom"><b>{metric.delta}</b><span>{metric.note}</span></div></article>)}</section><section className="attention-banner"><div className="attention-icon"><CircleAlert size={21} /></div><div><strong>{summary.expiringSensors} sensors are expiring within 30 days</strong><span>Review live inventory before coverage is interrupted.</span></div><Link className="text-button" href="/sensors?status=EXPIRING_SOON">Review sensors <span>→</span></Link></section><section className="panel expiration-panel"><div className="panel-heading"><div><p className="eyebrow">Live inventory</p><h2>Recent sensor records</h2></div><Link className="ghost-button" href="/sensors">View all <span>→</span></Link></div>{sensors.length === 0 ? <div className="empty-panel"><h2>No sensors yet</h2><p>Add a sensor to see live inventory here.</p></div> : <div className="table-wrap"><table><thead><tr><th>Serial</th><th>Type</th><th>Customer ID</th><th>Expires</th><th>Status</th></tr></thead><tbody>{sensors.map((sensor) => <tr key={sensor._id}><td><strong className="serial">{sensor.serialNumber}</strong></td><td className="muted-cell">{sensor.sensorTypeId}</td><td className="muted-cell">{sensor.customerId ?? 'Unassigned'}</td><td>{formatDate(sensor.expiresAt)} <small className="days-remaining">({daysRemaining(sensor.expiresAt)}d)</small></td><td><span className="status status-healthy"><i />{sensor.status}</span></td></tr>)}</tbody></table></div>}</section><footer className="page-footer"><span>Live data · Last loaded {new Date().toLocaleTimeString()}</span><a href="http://localhost:3001/api/v1/health">API status <i /></a></footer></div>;
}
