'use client';

import React, { useEffect, useState } from 'react';
import { 
  Check, 
  Laptop, 
  Moon, 
  Palette, 
  Save, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Volume2, 
  Wifi, 
  Radio
} from 'lucide-react';
import { AppShell } from '../components/app-shell';
import { useTheme, type Theme } from '../components/theme-provider';
import { getCachedSession, getSession } from '../../lib/api';

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<{ email?: string; role?: string; name?: string } | null>(null);
  
  // Local interface preferences
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [denseTables, setDenseTables] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load session info
    const cached = getCachedSession();
    if (cached?.user) {
      setCurrentUser(cached.user);
    } else {
      void getSession().then(({ data }) => {
        if (data?.session?.user) setCurrentUser(data.session.user);
      });
    }

    // Load stored preferences
    try {
      const storedAuto = localStorage.getItem('caresignal-autorefresh');
      if (storedAuto !== null) setAutoRefresh(storedAuto === 'true');

      const storedSound = localStorage.getItem('caresignal-sound');
      if (storedSound !== null) setSoundAlerts(storedSound === 'true');

      const storedDense = localStorage.getItem('caresignal-dense');
      if (storedDense !== null) setDenseTables(storedDense === 'true');
    } catch {}
  }, []);

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('caresignal-autorefresh', String(autoRefresh));
      localStorage.setItem('caresignal-sound', String(soundAlerts));
      localStorage.setItem('caresignal-dense', String(denseTables));
      
      setToastMessage('Preferences saved successfully');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Failed to save preferences');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const themeOptions: { id: Theme; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    {
      id: 'system',
      label: 'Device Preference',
      desc: 'Automatically synchronizes with your operating system light / dark settings',
      icon: Laptop,
    },
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean, high-visibility medical daylight interface optimized for bright environments',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep obsidian contrast theme designed for low-light clinical control centers',
      icon: Moon,
    },
  ];

  return (
    <AppShell title="Platform Settings">
      <div className="page-content">
        <div className="page-header-row">
          <div>
            <p className="eyebrow">Customization & Preferences</p>
            <h1 className="page-title-text">Platform Settings</h1>
          </div>
          <button 
            type="button" 
            className="primary-button"
            onClick={handleSavePreferences}
          >
            <Save size={16} /> Save Preferences
          </button>
        </div>

        {/* Section 1: Appearance & Theme Mode */}
        <section className="panel form-panel" style={{ marginBottom: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--teal-soft)',
                color: 'var(--teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Palette size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', margin: 0, color: 'var(--ink-heading)' }}>Appearance & Theme</h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Configure how the CareSignal application displays across your workstations.
                </p>
              </div>
            </div>
            <span className="id-badge" style={{ textTransform: 'capitalize' }}>
              Current: {theme === 'system' ? `System (${resolvedTheme})` : resolvedTheme}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '8px' }}>
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  style={{
                    border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                    background: isSelected ? 'var(--teal-soft)' : 'var(--white)',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isSelected ? '0 4px 14px rgba(27, 139, 131, 0.12)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '7px',
                        background: isSelected ? 'var(--teal)' : 'var(--surface-hover)',
                        color: isSelected ? '#ffffff' : 'var(--ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={16} />
                      </div>
                      {isSelected && (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--teal)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <strong style={{ fontSize: '14px', color: 'var(--ink-heading)', display: 'block', marginBottom: '4px' }}>
                      {opt.label}
                    </strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
                      {opt.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Workspace & Operational Preferences */}
        <section className="panel form-panel" style={{ marginBottom: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(79, 121, 199, 0.15)',
                color: 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Radio size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', margin: 0, color: 'var(--ink-heading)' }}>Operational Telemetry</h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Manage real-time streaming, alerting sounds, and table densities.
                </p>
              </div>
            </div>
          </div>

          <div className="toggle-list" style={{ margin: 0 }}>
            <label className="toggle-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wifi size={16} style={{ color: 'var(--teal)' }} />
                  <strong>Real-Time Telemetry Streaming</strong>
                </div>
                <small>Automatically receive live sensor readings and operational status via SSE streams</small>
              </div>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            </label>

            <label className="toggle-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={16} style={{ color: 'var(--amber)' }} />
                  <strong>Critical Threshold Audio Alarms</strong>
                </div>
                <small>Play subtle audible notification tone when sensors trigger critical telemetry status</small>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
              />
            </label>

            <label className="toggle-card">
              <div className="toggle-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--blue)' }} />
                  <strong>Compact Data Grid Mode</strong>
                </div>
                <small>Increase information density on sensor, audit, and customer data tables</small>
              </div>
              <input
                type="checkbox"
                checked={denseTables}
                onChange={(e) => setDenseTables(e.target.checked)}
              />
            </label>
          </div>
        </section>

        {/* Section 3: Account & Session Info */}
        <section className="panel form-panel">
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(5, 150, 105, 0.15)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', margin: 0, color: 'var(--ink-heading)' }}>Account & Identity</h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Active session credentials and platform runtime details.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--surface-hover)', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Account Email
              </span>
              <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                {currentUser?.email ?? 'Authenticated Operator'}
              </strong>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--surface-hover)', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Access Level
              </span>
              <strong style={{ fontSize: '13.5px', color: 'var(--teal)', textTransform: 'capitalize' }}>
                {currentUser?.role ?? 'Administrator'}
              </strong>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--surface-hover)', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Platform Version
              </span>
              <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                CareSignal v2.4.0 (PWA Ready)
              </strong>
            </div>
          </div>
        </section>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="toast">
            <Check size={16} style={{ color: 'var(--teal)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
