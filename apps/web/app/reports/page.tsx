import { FileBarChart } from 'lucide-react';
import { AppShell } from '../components/app-shell';

export default function ReportsPage() {
  return <AppShell><div className="page-content"><section className="page-heading"><div><p className="eyebrow">Insights & exports</p><h1>Reports</h1><p className="heading-copy">Generate operational reports from live workspace data.</p></div><button className="primary-button" disabled><FileBarChart size={17} /> New report</button></section><section className="panel empty-panel"><FileBarChart size={28} /><h2>No reports generated</h2><p>Report generation will appear here when the reports API is configured.</p></section></div></AppShell>;
}
