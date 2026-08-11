import { FileBarChart } from 'lucide-react';
import { AppShell } from '../components/app-shell';

export default function ReportsPage() {
  const topbarRight = (
    <button className="primary-button" disabled>
      <FileBarChart size={17} /> New report
    </button>
  );

  return (
    <AppShell headerActions={topbarRight}>
      <div className="page-content">
        <section className="panel empty-panel">
          <FileBarChart size={28} />
          <h2>No reports generated</h2>
          <p>Report generation will appear here when the reports API is configured.</p>
        </section>
      </div>
    </AppShell>
  );
}
