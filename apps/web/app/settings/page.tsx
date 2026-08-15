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

  
  const [companyName, setCompanyName] = useState('CareSignal Health Systems');
  const [contactEmail, setContactEmail] = useState('ops@caresignal.health');
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [expirationWindow, setExpirationWindow] = useState('30');
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-0199');

  
  const [expirationAlerts, setExpirationAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  
  const [enforceTwoFactor, setEnforceTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipRestriction, setIpRestriction] = useState(false);
  const [auditRetention, setAuditRetention] = useState('90');

  
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
      setSavedMessage('Settings updated successfully!');
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

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header-row">
          <div>
            <p className="eyebrow">Workspace Configuration</p>
            <h1 className="page-title-text">Platform Settings</h1>
          </div>
        </div>

        
        <div className="settings-tabs-bar">
          <button
            type="button"
            className={activeTab === 'company' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('company')}
          >
            <Building2 size={16} /> Company Profile
          </button>
          <button
            type="button"
            className={activeTab === 'notifications' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('notifications')}
          >
            <BellRing size={16} /> Notifications & Alerts
          </button>
          <button
            type="button"
            className={activeTab === 'security' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={16} /> Security & Access
          </button>
          <button
            type="button"
            className={activeTab === 'api' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('api')}
          >
            <KeyRound size={16} /> API Keys & Access
          </button>
        </div>

        {savedMessage && (
          <div className="toast">
            <Check size={16} color="#34d399" />
            <span>{savedMessage}</span>
          </div>
        )}

        
        {activeTab === 'company' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Company Profile</h2>
              <p>This information appears in reports, telemetry summaries, and patient documentation.</p>

              <div className="form-grid">
                <label>
                  <span>Company name</span>
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </label>
                <label>
                  <span>Customer-facing email</span>
                  <input
                    required
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Contact email address"
                  />
                </label>
                <label>
                  <span>Support hotline</span>
                  <input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="Support phone number"
                  />
                </label>
                <label>
                  <span>Timezone</span>
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
                <label style={{ gridColumn: 'span 2' }}>
                  <span>Default sensor expiration alert window</span>
                  <select value={expirationWindow} onChange={(e) => setExpirationWindow(e.target.value)}>
                    <option value="60">60 days prior to expiration</option>
                    <option value="30">30 days prior to expiration (Recommended)</option>
                    <option value="14">14 days prior to expiration</option>
                    <option value="7">7 days prior to expiration</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save changes
              </button>
            </div>
          </form>
        )}

        
        {activeTab === 'notifications' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Notification Preferences</h2>
              <p>Configure automated email and operational alerts for clinical telemetry events.</p>

              <div className="toggle-list">
                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Sensor expiration alerts</strong>
                    <small>Receive warnings when sensors enter the configured expiration window.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={expirationAlerts}
                    onChange={(e) => setExpirationAlerts(e.target.checked)}
                  />
                </label>

                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Critical device status alerts</strong>
                    <small>Immediate notification when a sensor status shifts to EXPIRED or DISABLED.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={criticalAlerts}
                    onChange={(e) => setCriticalAlerts(e.target.checked)}
                  />
                </label>

                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Daily operational digest</strong>
                    <small>Receive a morning email summary of active telemetry inventory and new patients.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                  />
                </label>

                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Weekly PDF executive report</strong>
                    <small>Automated weekly summary report delivered directly to administrators.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyReport}
                    onChange={(e) => setWeeklyReport(e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save preferences
              </button>
            </div>
          </form>
        )}

        
        {activeTab === 'security' && (
          <form className="panel form-panel" onSubmit={handleSave}>
            <div className="form-section">
              <h2>Security & Authentication</h2>
              <p>Manage workspace access controls, session timeouts, and compliance policies.</p>

              <div className="toggle-list">
                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Enforce Two-Factor Authentication (2FA)</strong>
                    <small>Require all workspace team members to authenticate with 2FA / Authenticator app.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={enforceTwoFactor}
                    onChange={(e) => setEnforceTwoFactor(e.target.checked)}
                  />
                </label>

                <label className="toggle-card">
                  <div className="toggle-info">
                    <strong>Restrict login by IP range</strong>
                    <small>Limit workspace portal access strictly to authorized corporate IP subnets.</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={ipRestriction}
                    onChange={(e) => setIpRestriction(e.target.checked)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  <span>Inactivity session timeout</span>
                  <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                  </select>
                </label>
                <label>
                  <span>Audit log retention period</span>
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
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Save security settings
              </button>
            </div>
          </form>
        )}

        
        {activeTab === 'api' && (
          <div className="panel form-panel">
            <div className="form-section">
              <h2>API Keys & Ingestion Webhooks</h2>
              <p>Manage programmatic credentials for automated sensor telemetry ingestion and EHR integrations.</p>

              <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: '10px', margin: '20px 0 24px', flexWrap: 'wrap' }}>
                <input
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key description (e.g. Production Telemetry Service)"
                  style={{
                    flex: '1 1 260px',
                    padding: '10px 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
                <button className="primary-button" type="submit" style={{ flexShrink: 0 }}>
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
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {item.key.slice(0, 12)}...{item.key.slice(-4)}
                          </code>
                        </td>
                        <td className="muted-cell">{item.createdAt}</td>
                        <td className="muted-cell">{item.lastUsed}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleCopyKey(item.id, item.key)}
                              title="Copy full key"
                              style={{ fontSize: '11px', padding: '5px 9px' }}
                            >
                              {copiedId === item.id ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleRevokeKey(item.id)}
                              style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: '11px', padding: '5px 9px' }}
                              title="Revoke key"
                            >
                              <Trash2 size={13} /> Revoke
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
