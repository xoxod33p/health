'use client';

import {
  BellRing,
  Building2,
  Check,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/app-shell';

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'notifications' | 'security' | 'api'>('company');
  const [savedMessage, setSavedMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Company Tab State
  const [companyName, setCompanyName] = useState('CareSignal Health Systems');
  const [contactEmail, setContactEmail] = useState('ops@caresignal.health');
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [expirationWindow, setExpirationWindow] = useState('30');
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-0199');

  // Notifications Tab State
  const [expirationAlerts, setExpirationAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // Security Tab State
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipRestriction, setIpRestriction] = useState(false);
  const [auditRetention, setAuditRetention] = useState('90');

  // API Access Tab State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key-1',
      name: 'Production Ingestion Service',
      key: 'cs_live_9f8a32b1c4e5d6f7890123456789abcd',
      createdAt: '2026-01-15',
      lastUsed: '2 mins ago',
    },
    {
      id: 'key-2',
      name: 'Staging Integration Webhook',
      key: 'cs_test_1a2b3c4d5e6f78901234567890abcdef',
      createdAt: '2026-02-01',
      lastUsed: '3 days ago',
    },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedMessage('Settings saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    }, 400);
  };

  const handleGenerateKey = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newKeyName.trim()) return;
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newEntry: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      key: `cs_live_${randomHex}`,
      createdAt: new Date().toISOString().split('T')[0] ?? '',
      lastUsed: 'Never',
    };
    setApiKeys([newEntry, ...apiKeys]);
    setNewKeyName('');
    setSavedMessage('API key generated successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter((item) => item.id !== id));
    setSavedMessage('API key revoked.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleCopyKey = (id: string, key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'company' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          <Building2 size={16} /> Company
        </button>
        <button
          className={`settings-tab ${activeTab === 'notifications' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <BellRing size={16} /> Notifications
        </button>
        <button
          className={`settings-tab ${activeTab === 'security' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <ShieldCheck size={16} /> Security
        </button>
        <button
          className={`settings-tab ${activeTab === 'api' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          <KeyRound size={16} /> API access
        </button>
      </div>
    </div>
  );

  return (
    <AppShell headerCenter={topbarCenter}>
      <div className="page-content narrow-content">
        {savedMessage && (
          <div className="toast">
            <span>{savedMessage}</span>
          </div>
        )}

        {/* Tab 1: Company */}
        {activeTab === 'company' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Company profile</h2>
              <p>This information appears in reports and notifications sent to your customers.</p>
              <div className="form-grid">
                <label>
                  Company name
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </label>
                <label>
                  Customer-facing email
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="ops@company.com"
                  />
                </label>
                <label>
                  Support hotline
                  <input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+1 (800) 000-0000"
                  />
                </label>
                <label>
                  Timezone
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Asia/Colombo">Sri Lanka Time (SLST / UTC+5:30)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </label>
                <label>
                  Default sensor expiration window
                  <select value={expirationWindow} onChange={(e) => setExpirationWindow(e.target.value)}>
                    <option value="60">60 days prior</option>
                    <option value="30">30 days prior</option>
                    <option value="14">14 days prior</option>
                    <option value="7">7 days prior</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button className="primary-button" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save changes
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Notification preferences</h2>
              <p>Configure automated email and operational alerts for your workspace.</p>
              <label className="toggle-row">
                <span>
                  <strong>Sensor expiration alerts</strong>
                  <small>Receive warnings when sensors enter the 30-day expiration window.</small>
                </span>
                <input
                  type="checkbox"
                  checked={expirationAlerts}
                  onChange={(e) => setExpirationAlerts(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Critical device status alerts</strong>
                  <small>Immediate notification when a sensor status shifts to EXPIRED or DISABLED.</small>
                </span>
                <input
                  type="checkbox"
                  checked={criticalAlerts}
                  onChange={(e) => setCriticalAlerts(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Daily operational digest</strong>
                  <small>Receive a morning email summary of active inventory and new customers.</small>
                </span>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Weekly PDF executive report</strong>
                  <small>Automated weekly export attached directly to account administrators.</small>
                </span>
                <input
                  type="checkbox"
                  checked={weeklyReport}
                  onChange={(e) => setWeeklyReport(e.target.checked)}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-button" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save preferences
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Security */}
        {activeTab === 'security' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Security & authentication</h2>
              <p>Manage workspace access controls and compliance policies.</p>
              <label className="toggle-row">
                <span>
                  <strong>Enforce Two-Factor Authentication (2FA)</strong>
                  <small>Require all workspace team members to use TOTP / Authenticator app login.</small>
                </span>
                <input
                  type="checkbox"
                  checked={enforceTwoFactor}
                  onChange={(e) => setEnforceTwoFactor(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Restrict login by IP range</strong>
                  <small>Limit admin portal access strictly to trusted company IP subnets.</small>
                </span>
                <input
                  type="checkbox"
                  checked={ipRestriction}
                  onChange={(e) => setIpRestriction(e.target.checked)}
                />
              </label>
              <div className="form-grid" style={{ marginTop: '16px' }}>
                <label>
                  Inactivity session timeout
                  <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                  </select>
                </label>
                <label>
                  Audit log retention period
                  <select value={auditRetention} onChange={(e) => setAuditRetention(e.target.value)}>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year (365 days)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button className="primary-button" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save security settings
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: API Access */}
        {activeTab === 'api' && (
          <div className="panel form-panel">
            <div className="form-section">
              <h2>API keys & webhooks</h2>
              <p>Manage programmatic access keys for automated sensor ingestion and system integrations.</p>

              <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: '10px', margin: '18px 0 24px' }}>
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key description (e.g., Warehouse Scanner service)"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                />
                <button className="primary-button" type="submit">
                  <Plus size={16} /> Generate API key
                </button>
              </form>

              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Token</th>
                      <th>Created</th>
                      <th>Last Used</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <code
                            style={{
                              fontFamily: 'DM Mono, monospace',
                              fontSize: '11px',
                              background: '#f4f7f7',
                              padding: '3px 7px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.key.slice(0, 12)}...{item.key.slice(-4)}
                          </code>
                        </td>
                        <td className="muted-cell">{item.createdAt}</td>
                        <td className="muted-cell">{item.lastUsed}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleCopyKey(item.id, item.key)}
                              title="Copy full key"
                            >
                              {copiedId === item.id ? <Check size={14} color="var(--teal)" /> : <Copy size={14} />}
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleRevokeKey(item.id)}
                              style={{ color: 'var(--coral)', borderColor: '#f7d8d2' }}
                              title="Revoke key"
                            >
                              <Trash2 size={14} /> Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
