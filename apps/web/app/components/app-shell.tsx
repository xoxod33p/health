'use client';

import { Activity, Boxes, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Menu, Settings, Tag, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCachedSession, getSession, signOut } from '../../lib/api';

const navigation = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Sensors', href: '/sensors', icon: Boxes },
  { label: 'Audit log', href: '/audit', icon: ClipboardList },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
];

const catalog = [
  { label: 'Sensor Types', href: '/sensor-types', icon: Tag },
];

export function AppShell({ children, title, headerCenter, headerActions }: Readonly<{ children: React.ReactNode; title?: string; headerCenter?: React.ReactNode; headerActions?: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const cachedSession = getCachedSession();
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'error'>(cachedSession ? 'ready' : 'loading');
  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? (pathname.startsWith('/users') ? 'User management' : pathname.startsWith('/settings') ? 'Settings' : 'Workspace');

  useEffect(() => {
    let mounted = true;
    void getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.session) {
        router.replace('/login');
        return;
      }
      setAuthState('ready');
    }).catch(() => { if (mounted) setAuthState('error'); });
    return () => { mounted = false; };
  }, [router]);

  const handleSignOut = () => {
    void signOut().then(() => router.replace('/login'));
  };

  if (authState === 'loading') return <div className="auth-loading"><div className="brand-mark"><Activity size={19} /></div><span>Checking secure session...</span></div>;
  if (authState === 'error') return <div className="auth-loading"><strong>Session verification failed.</strong><span>Please sign in again.</span></div>;

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div>
            <span className="brand-name">care<span>signal</span></span>
          </div>
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#dbe7e7',
                borderRadius: '6px',
                padding: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className={`nav-item ${activeLabel === label ? 'nav-active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={17} strokeWidth={1.8} />
              <span style={{ fontWeight: 500, letterSpacing: '-0.1px' }}>{label}</span>
            </Link>
          ))}
          <span className="nav-label nav-label-spaced">Catalog</span>
          {catalog.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className={`nav-item ${activeLabel === label ? 'nav-active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={17} strokeWidth={1.8} />
              <span style={{ fontWeight: 500, letterSpacing: '-0.1px' }}>{label}</span>
            </Link>
          ))}
          <span className="nav-label nav-label-spaced">Manage</span>
          <Link className={`nav-item ${activeLabel === 'User management' ? 'nav-active' : ''}`} href="/users" onClick={() => setSidebarOpen(false)}>
            <Users size={17} strokeWidth={1.8} />
            <span style={{ fontWeight: 500 }}>User management</span>
          </Link>
          <Link className={`nav-item ${activeLabel === 'Settings' ? 'nav-active' : ''}`} href="/settings" onClick={() => setSidebarOpen(false)}>
            <Settings size={17} strokeWidth={1.8} />
            <span style={{ fontWeight: 500 }}>Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer - Sign Out Only */}
        <div className="sidebar-footer" style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '6px',
              background: '#ef444415',
              color: '#f87171',
              border: '1px solid #ef444440',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="content-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <h1 className="topbar-title">{title ?? activeLabel}</h1>
          </div>
          {headerCenter && <div className="topbar-center">{headerCenter}</div>}
          {headerActions && <div className="topbar-right">{headerActions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}
