'use client';

import {
  Activity,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/app-shell';
import { apiDownload, apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

export type ReportType = 'SENSOR_INVENTORY' | 'EXPIRATION_REPLACEMENT' | 'CUSTOMER_COVERAGE' | 'OPERATIONAL_SUMMARY';
export type DateRange = '7_DAYS' | '30_DAYS' | '90_DAYS' | 'ALL_TIME';

export interface StoredReportFile {
  format: 'csv' | 'excel' | 'pdf' | 'xlsx';
  filename: string;
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

export interface ReportItem {
  _id: string;
  companyId: string;
  title: string;
  type: ReportType;
  status: string;
  dateRange: DateRange;
  parameters: Record<string, unknown>;
  summary: Record<string, unknown>;
  data: Array<Record<string, unknown>>;
  columns: Array<{ key: string; header: string }>;
  storageFiles?: StoredReportFile[];
  generatedBy: string;
  createdAt?: string;
}

function formatAuthorName(raw?: string): string {
  if (!raw) return 'System';
  if (!raw.includes('@')) {
    const firstWord = raw.trim().split(' ')[0] || raw;
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }
  const username = raw.split('@')[0] || '';
  const parts = username.split(/[._\-\d]+/);
  const firstName = parts.find((p) => p.length > 0) || username;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

interface ReportStats {
  total: number;
  inventory: number;
  expiration: number;
  coverage: number;
  summary: number;
}

const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; description: string; icon: typeof Boxes; tone: string; color: string; badgeClass: string }
> = {
  SENSOR_INVENTORY: {
    label: 'Sensor Inventory & Lifecycle',
    description: 'Hardware registry, active deployment, customer assignment, and 15-day lifecycle tracking.',
    icon: Boxes,
    tone: 'teal',
    color: '#0f766e',
    badgeClass: 'status-healthy',
  },
  EXPIRATION_REPLACEMENT: {
    label: 'Expiration & Replacement Log',
    description: '15-day sensor expiration tracking, past-due units, and maintenance replacement records.',
    icon: Clock,
    tone: 'amber',
    color: '#d97706',
    badgeClass: 'status-warning',
  },
  CUSTOMER_COVERAGE: {
    label: 'Customer Device Coverage',
    description: 'Customer directory coverage, attached sensor serial numbers, and device distribution.',
    icon: Activity,
    tone: 'blue',
    color: '#2563eb',
    badgeClass: 'status-healthy',
  },
  OPERATIONAL_SUMMARY: {
    label: 'Platform Operational Summary',
    description: 'Executive overview of clinical platform health, 15-day device utilization, and telemetry status.',
    icon: FileBarChart,
    tone: 'coral',
    color: '#e11d48',
    badgeClass: 'status-critical',
  },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats>({ total: 0, inventory: 0, expiration: 0, coverage: 0, summary: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ReportType>('SENSOR_INVENTORY');
  const [createRange, setCreateRange] = useState<DateRange>('ALL_TIME');
  const [customTitle, setCustomTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  
  const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
  const [viewerSearch, setViewerSearch] = useState('');
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reportsRes, statsRes] = await Promise.all([
        apiFetch<{ data: ReportItem[]; total: number }>('/reports?limit=100'),
        apiFetch<ReportStats>('/reports/stats'),
      ]);
      setReports(reportsRes.data);
      setStats(statsRes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => void loadData()).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchType = typeFilter === 'ALL' || r.type === typeFilter;
      const matchQuery =
        !query ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.generatedBy.toLowerCase().includes(query.toLowerCase());
      return matchType && matchQuery;
    });
  }, [reports, query, typeFilter]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const created = await apiFetch<ReportItem>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: createType,
          dateRange: createRange,
          title: customTitle.trim() || undefined,
        }),
      });
      setCreateOpen(false);
      setCustomTitle('');
      await loadData();
      setActiveReport(created);
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : 'Failed to generate report');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async (reportId: string, format: 'excel' | 'pdf' | 'csv') => {
    setExportingFormat(`${reportId}-${format}`);
    try {
      const ext = format === 'excel' ? 'xlsx' : format;
      await apiDownload(`/reports/${reportId}/export?format=${format}`, `report-${reportId}.${ext}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/reports/${id}`, { method: 'DELETE' });
      if (activeReport?._id === id) setActiveReport(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports by title or author"
        />
      </div>
      <select
        className="select-control"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      >
        <option value="ALL">All report types</option>
        <option value="SENSOR_INVENTORY">Sensor Inventory</option>
        <option value="EXPIRATION_REPLACEMENT">Expiration & Replacements</option>
        <option value="CUSTOMER_COVERAGE">Customer Coverage</option>
        <option value="OPERATIONAL_SUMMARY">Operational Summary</option>
      </select>
      <span className="result-count">{filteredReports.length} reports</span>
    </div>
  );

  const topbarRight = (
    <button
      className="primary-button"
      onClick={() => {
        setCreateError('');
        setCreateOpen(true);
      }}
    >
      <Plus size={17} /> Generate report
    </button>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">

        
        <section className="mini-stat-grid">
          <div className="mini-stat">
            <div className="mini-stat-top">
              <span>Total Generated</span>
              <FileBarChart size={18} />
            </div>
            <strong>{stats.total}</strong>
            <small>Archived reports</small>
          </div>
          <div className="mini-stat mini-stat-teal">
            <div className="mini-stat-top">
              <span>Sensor Inventory</span>
              <Boxes size={18} />
            </div>
            <strong>{stats.inventory}</strong>
            <small>Hardware lifecycles</small>
          </div>
          <div className="mini-stat mini-stat-amber">
            <div className="mini-stat-top">
              <span>Expiration & Logs</span>
              <Clock size={18} />
            </div>
            <strong>{stats.expiration}</strong>
            <small>Maintenance tracking</small>
          </div>
          <div className="mini-stat mini-stat-blue">
            <div className="mini-stat-top">
              <span>Coverage & Health</span>
              <Activity size={18} />
            </div>
            <strong>{stats.coverage + stats.summary}</strong>
            <small>Coverage & summary</small>
          </div>
        </section>

        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" /> Loading reports repository...
          </div>
        )}

        {error && (
          <div className="data-error">
            <span>{error}</span>
            <button className="secondary-button" onClick={() => void loadData()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Export & Intelligence</p>
                <h2>Generated Reports History</h2>
              </div>
              <button
                className="ghost-button"
                onClick={() => {
                  setCreateError('');
                  setCreateOpen(true);
                }}
              >
                + New report <span>→</span>
              </button>
            </div>

            {filteredReports.length === 0 ? (
              <div className="empty-panel" style={{ padding: '40px 20px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#e0efeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#0f766e',
                  }}
                >
                  <FileBarChart size={24} />
                </div>
                <h2 style={{ fontSize: '18px', margin: '0 0 8px' }}>No reports found</h2>
                <p style={{ maxWidth: '440px', margin: '0 auto 24px', color: '#64748b', fontSize: '13px' }}>
                  {query || typeFilter !== 'ALL'
                    ? 'No generated reports matched your search filters.'
                    : 'Generate your first comprehensive report to analyze sensor inventory, expirations, customer coverage, and export as Excel, PDF, or CSV.'}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setCreateType('SENSOR_INVENTORY');
                      setCreateOpen(true);
                    }}
                  >
                    <Boxes size={15} /> Sensor Inventory
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setCreateType('EXPIRATION_REPLACEMENT');
                      setCreateOpen(true);
                    }}
                  >
                    <Clock size={15} /> Expiration Log
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setCreateType('OPERATIONAL_SUMMARY');
                      setCreateOpen(true);
                    }}
                  >
                    <FileBarChart size={15} /> Executive Summary
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="table-wrap custom-scrollbar"
                style={{
                  maxHeight: 'calc(100vh - 340px)',
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
                      <th style={{ background: '#ffffff' }}>Report Title</th>
                      <th style={{ background: '#ffffff' }}>Type</th>
                      <th style={{ background: '#ffffff' }}>Time Scope</th>
                      <th style={{ background: '#ffffff' }}>Key Metrics</th>
                      <th style={{ background: '#ffffff' }}>Generated By</th>
                      <th style={{ background: '#ffffff' }}>Date</th>
                      <th style={{ textAlign: 'right', background: '#ffffff' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => {
                      const cfg = REPORT_TYPE_CONFIG[report.type] ?? REPORT_TYPE_CONFIG.SENSOR_INVENTORY;
                      const Icon = cfg.icon;
                      const summaryEntries = Object.entries(report.summary || {}).slice(0, 2);

                      return (
                        <tr key={report._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: `${cfg.color}15`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: cfg.color,
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={16} />
                              </div>
                              <div>
                                <strong
                                  style={{
                                    cursor: 'pointer',
                                    color: '#17272d',
                                    display: 'block',
                                  }}
                                  onClick={() => setActiveReport(report)}
                                >
                                  {report.title}
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {report.data?.length ?? 0} records
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                                    ● Saved in Storage (PDF, Excel, CSV)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: `${cfg.color}15`,
                                color: cfg.color,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {cfg.label.split(' ')[0]}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                              {report.dateRange.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {summaryEntries.map(([k, v]) => (
                                <span
                                  key={k}
                                  style={{
                                    fontSize: '11px',
                                    background: '#f1f5f9',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    color: '#334155',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {k.replace(/([A-Z])/g, ' $1').toLowerCase()}: <b>{String(v)}</b>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="muted-cell" style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {formatAuthorName(report.generatedBy)}
                            </span>
                          </td>
                          <td className="muted-cell" style={{ fontSize: '12px' }}>
                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US') : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                              
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setActiveReport(report)}
                                title="View report details"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                <Eye size={13} /> View
                              </button>

                              
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => void handleExport(report._id, 'excel')}
                                disabled={exportingFormat === `${report._id}-excel`}
                                title="Export to Excel (.xlsx)"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  color: '#059669',
                                  borderColor: '#a7f3d0',
                                }}
                              >
                                {exportingFormat === `${report._id}-excel` ? (
                                  <RefreshCw size={13} className="spin" />
                                ) : (
                                  <FileSpreadsheet size={13} />
                                )}
                                Excel
                              </button>

                              
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => void handleExport(report._id, 'pdf')}
                                disabled={exportingFormat === `${report._id}-pdf`}
                                title="Export as PDF"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  color: '#e11d48',
                                  borderColor: '#fecdd3',
                                }}
                              >
                                {exportingFormat === `${report._id}-pdf` ? (
                                  <RefreshCw size={13} className="spin" />
                                ) : (
                                  <FileText size={13} />
                                )}
                                PDF
                              </button>

                              
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => void handleExport(report._id, 'csv')}
                                disabled={exportingFormat === `${report._id}-csv`}
                                title="Download CSV"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                {exportingFormat === `${report._id}-csv` ? (
                                  <RefreshCw size={13} className="spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                              </button>

                              
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => void handleDelete(report._id, report.title)}
                                disabled={deletingId === report._id}
                                title="Delete report"
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  color: '#ef4444',
                                  borderColor: '#fecaca',
                                }}
                              >
                                {deletingId === report._id ? (
                                  <RefreshCw size={13} className="spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        
        {createOpen && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '560px' }}>
              <div className="modal-heading">
                <div>
                  <h2 style={{ fontSize: '19px' }}>Generate Platform Report</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Select report parameters for live database aggregation & exports
                  </p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleGenerate}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  
                  <div>
                    <label style={{ fontWeight: 600, fontSize: '12px', color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Report Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="report-category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {(Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((typeKey) => {
                        const config = REPORT_TYPE_CONFIG[typeKey];
                        const Icon = config.icon;
                        const isSelected = createType === typeKey;

                        return (
                          <div
                            key={typeKey}
                            onClick={() => setCreateType(typeKey)}
                            style={{
                              border: `2px solid ${isSelected ? config.color : '#e2e8f0'}`,
                              background: isSelected ? `${config.color}08` : '#ffffff',
                              borderRadius: '8px',
                              padding: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: `${config.color}20`,
                                  color: config.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icon size={14} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? config.color : '#1e293b' }}>
                                {config.label}
                              </span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                              {config.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  
                  <div>
                    <label style={{ fontWeight: 600, fontSize: '12px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Time Scope
                    </label>
                    <div className="report-scope-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: '6px' }}>
                      {[
                        { id: 'ALL_TIME', label: 'All Time' },
                        { id: '90_DAYS', label: 'Last 90d' },
                        { id: '30_DAYS', label: 'Last 30d' },
                        { id: '7_DAYS', label: 'Last 7d' },
                      ].map((range) => (
                        <button
                          key={range.id}
                          type="button"
                          onClick={() => setCreateRange(range.id as DateRange)}
                          style={{
                            padding: '8px 6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: `1px solid ${createRange === range.id ? '#0f766e' : '#cbd5e1'}`,
                            background: createRange === range.id ? '#0f766e' : '#fff',
                            color: createRange === range.id ? '#fff' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  
                  <label>
                    Report Title (optional)
                    <input
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </label>

                  
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#475569',
                    }}
                  >
                    <CheckCircle2 size={15} style={{ color: '#0f766e', flexShrink: 0 }} />
                    <span>Includes immediate exports to <b>Excel (.xlsx)</b>, <b>PDF Document</b>, and <b>CSV</b> with real-time audit logging.</span>
                  </div>

                </div>

                {createError && (
                  <div className="form-error" style={{ marginTop: '14px' }}>
                    {createError}
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '22px' }}>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <RefreshCw size={15} className="spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <FileBarChart size={15} /> Generate Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Full Details View Modal */}
        {activeReport && (
          <div className="modal-backdrop">
            <div
              className="modal-card report-viewer-modal"
              style={{
                maxWidth: '960px',
                width: '95%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
              }}
            >
              
              <div
                className="report-modal-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: `${REPORT_TYPE_CONFIG[activeReport.type]?.color || '#0f766e'}15`,
                        color: REPORT_TYPE_CONFIG[activeReport.type]?.color || '#0f766e',
                      }}
                    >
                      {REPORT_TYPE_CONFIG[activeReport.type]?.label || activeReport.type}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Scope: <b>{activeReport.dateRange}</b>
                    </span>
                  </div>
                  <h2 style={{ fontSize: '19px', margin: 0, color: '#0f172a', wordBreak: 'break-word' }}>
                    {activeReport.title}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Generated on {activeReport.createdAt ? new Date(activeReport.createdAt).toLocaleString('en-US') : '—'} by <b>{formatAuthorName(activeReport.generatedBy)}</b> · {activeReport.data?.length ?? 0} total records
                  </p>
                </div>

                <div className="report-modal-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => window.print()}
                    style={{ fontSize: '11px', padding: '7px 10px' }}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleExport(activeReport._id, 'excel')}
                    disabled={exportingFormat === `${activeReport._id}-excel`}
                    style={{ fontSize: '11px', padding: '7px 10px', color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    <FileSpreadsheet size={13} /> Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleExport(activeReport._id, 'pdf')}
                    disabled={exportingFormat === `${activeReport._id}-pdf`}
                    style={{ fontSize: '11px', padding: '7px 10px', color: '#e11d48', borderColor: '#fecdd3' }}
                  >
                    <FileText size={13} /> PDF
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleExport(activeReport._id, 'csv')}
                    disabled={exportingFormat === `${activeReport._id}-csv`}
                    style={{ fontSize: '11px', padding: '7px 10px' }}
                  >
                    <Download size={13} /> CSV
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setActiveReport(null)}
                    style={{ marginLeft: '4px' }}
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  fontSize: '11px',
                  color: '#166534',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
                  <span>
                    <b>Archived in Storage:</b> All generated files (PDF, Excel .xlsx, and CSV) are safely stored in persistent storage and available for download.
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#15803d', fontFamily: 'monospace', fontWeight: 600 }}>
                  storage/reports/{activeReport.companyId}/{activeReport._id}/
                </span>
              </div>

              
              {activeReport.summary && Object.keys(activeReport.summary).length > 0 && (
                <div className="report-kpi-grid">
                  {Object.entries(activeReport.summary).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 14px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <strong style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800 }}>
                        {String(val)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Inside Table */}
              <div className="report-viewer-search-row">
                <div className="search-field" style={{ flex: '1 1 auto', maxWidth: '320px', minWidth: '0', padding: '6px 10px' }}>
                  <Search size={14} />
                  <input
                    value={viewerSearch}
                    onChange={(e) => setViewerSearch(e.target.value)}
                    placeholder="Search inside table..."
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <span className="report-viewer-count" style={{ fontSize: '11px', color: '#64748b' }}>
                  Showing {
                    (activeReport.data || []).filter((row) =>
                      Object.values(row).some((v) =>
                        String(v).toLowerCase().includes(viewerSearch.toLowerCase())
                      )
                    ).length
                  } of {activeReport.data?.length ?? 0} records
                </span>
              </div>

              
              <div
                className="table-wrap custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <table className="rich-table">
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #edf1f1' }}>
                    <tr>
                      {activeReport.columns?.map((col) => (
                        <th key={col.key} style={{ background: '#f8fafc', whiteSpace: 'nowrap' }}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(activeReport.data || [])
                      .filter((row) =>
                        !viewerSearch ||
                        Object.values(row).some((v) =>
                          String(v).toLowerCase().includes(viewerSearch.toLowerCase())
                        )
                      )
                      .map((row, idx) => (
                        <tr key={idx}>
                          {activeReport.columns?.map((col) => {
                            const val = row[col.key];
                            const isStatus =
                              col.key.toLowerCase().includes('status') ||
                              col.key.toLowerCase().includes('type') ||
                              col.key.toLowerCase().includes('record');

                            return (
                              <td key={col.key} style={{ fontSize: '12px' }}>
                                {isStatus && typeof val === 'string' ? (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background:
                                        val.includes('ACTIVE') || val.includes('Optimal') || val.includes('Healthy') || val.includes('Operational')
                                          ? '#e0efeb'
                                          : val.includes('EXPIRED') || val.includes('Action') || val.includes('DISABLED')
                                          ? '#fee2e2'
                                          : '#fef3c7',
                                      color:
                                        val.includes('ACTIVE') || val.includes('Optimal') || val.includes('Healthy') || val.includes('Operational')
                                          ? '#0f766e'
                                          : val.includes('EXPIRED') || val.includes('Action') || val.includes('DISABLED')
                                          ? '#b91c1c'
                                          : '#b45309',
                                    }}
                                  >
                                    {val}
                                  </span>
                                ) : (
                                  String(val !== undefined && val !== null ? val : '—')
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Actions */}
              <div
                className="modal-actions"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDelete(activeReport._id, activeReport.title)}
                  style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: '12px' }}
                >
                  <Trash2 size={14} /> Delete this report
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setActiveReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
