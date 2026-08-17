'use client';

import React, { useEffect, useState } from 'react';
import { 
  Check, 
  Laptop, 
  Moon, 
  Palette, 
  ShieldCheck, 
  Sun 
} from 'lucide-react';
import { AppShell } from '../components/app-shell';
import { useTheme, type Theme } from '../components/theme-provider';
import { getCachedSession, getSession } from '../../lib/api';

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<{ email?: string; role?: string; name?: string } | null>(null);

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
  }, []);

  const themeOptions: { id: Theme; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean, high-visibility medical daylight interface optimized for bright environments (Default)',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep obsidian contrast theme designed for low-light clinical control centers',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'Device Preference',
      desc: 'Automatically synchronizes with your operating system light / dark settings',
      icon: Laptop,
    },
  ];

  return (
    <AppShell title="Platform Settings">
      <div className="page-content">
        <div className="page-header-row" style={{ marginBottom: '24px' }}>
          <div>
            <p className="eyebrow">Interface & Configuration</p>
            <h1 className="page-title-text">Settings</h1>
          </div>
        </div>

        {/* Theme Settings Section */}
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
                  Select your preferred color theme across the platform.
                </p>
              </div>
            </div>
            <span className="id-badge" style={{ textTransform: 'capitalize' }}>
              Active: {theme === 'system' ? `Device Preference (${resolvedTheme})` : resolvedTheme}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
                    padding: '18px 20px',
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '7px',
                        background: isSelected ? 'var(--teal)' : 'var(--surface-hover)',
                        color: isSelected ? '#ffffff' : 'var(--ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={17} />
                      </div>
                      {isSelected && (
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--teal)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <strong style={{ fontSize: '14px', color: 'var(--ink-heading)', display: 'block', marginBottom: '6px' }}>
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

        {/* Account Details Section */}
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
                CareSignal v2.4.0
              </strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
