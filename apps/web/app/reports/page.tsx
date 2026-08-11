'use client';

import { Download, FileBarChart, FileText, Filter, Table2 } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/app-shell';

const reports = [{ name: 'Sensor expiration report', description: 'Devices approaching their expiration window', format: 'CSV / PDF', updated: 'Today, 08:30' }, { name: 'Customer activity report', description: 'Customer records and device assignments', format: 'CSV / PDF', updated: 'Yesterday' }, { name: 'Notification delivery report', description: 'In-app and email delivery outcomes', format: 'CSV', updated: 'Aug 08, 2026' }, { name: 'Audit activity report', description: 'Immutable organization activity history', format: 'CSV / PDF', updated: 'Aug 01, 2026' }];

export default function ReportsPage() {
  const [notice, setNotice] = useState('');
  return <AppShell><div className="page-content"><section className="page-heading"><div><p className="eyebrow">Insights & exports</p><h1>Reports</h1><p className="heading-copy">Generate operational snapshots without leaving the workspace.</p></div><button className="primary-button" onClick={() => setNotice('Report generation queued')}> <FileBarChart size={17} /> New report</button></section><section className="report-summary"><div><span>Available reports</span><strong>8</strong></div><div><span>Exports this month</span><strong>42</strong></div><div><span>Last generated</span><strong>Today, 08:30</strong></div></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Report library</p><h2>Saved reports</h2></div><button className="filter-button"><Filter size={15} /> Date range</button></div><div className="report-list">{reports.map((report) => <article className="report-row" key={report.name}><div className="report-icon"><FileText size={19} /></div><div className="report-copy"><strong>{report.name}</strong><span>{report.description}</span></div><span className="report-format">{report.format}</span><time>{report.updated}</time><button className="icon-button" onClick={() => setNotice(`${report.name} download queued`)} aria-label={`Download ${report.name}`}><Download size={17} /></button></article>)}</div></section>{notice && <div className="toast"><Table2 size={16} />{notice}<button onClick={() => setNotice('')}>×</button></div>}</div></AppShell>;
}
