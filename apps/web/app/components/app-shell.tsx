'use client';

import { Activity, Boxes, ClipboardList, FileBarChart, LayoutDashboard, LogOut, MoreHorizontal, ShieldCheck, Users, X } from 'lucide-react';
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

export function AppShell({ children, title, headerCenter, headerActions }: Readonly<{ children: React.ReactNode; title?: string; headerCenter?: React.ReactNode; headerActions?: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const cachedSession = getCachedSession();
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'error'>(cachedSession ? 'ready' : 'loading');
  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? (
    pathname.startsWith('/users') ? 'User management' : 
    'Workspace'
  );

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

  if (authState === 'loading') {
    return (
      <div className="auth-loading-screen white-simple">
        <div className="auth-loading-simple">
          <div className="brand-mark-simple">
            <Activity size={24} strokeWidth={2.5} className="pulse-heartbeat" />
          </div>
          <span className="brand-name-simple">care<span>signal</span></span>
          <div className="simple-spinner" />
          <p className="simple-loading-text">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="auth-loading-screen white-simple">
        <div className="auth-loading-simple">
          <div className="brand-mark-simple error">
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <h3 style={{ margin: '14px 0 6px', fontSize: '17px', color: 'var(--ink-heading)', fontWeight: 600 }}>Session Expired</h3>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)' }}>Please sign in to continue.</p>
          <button
            type="button"
            className="primary-button"
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
            onClick={() => router.replace('/login')}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

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
          <span className="nav-label nav-label-spaced">Manage</span>
          <Link className={`nav-item ${activeLabel === 'User management' ? 'nav-active' : ''}`} href="/users" onClick={() => setSidebarOpen(false)}>
            <Users size={17} strokeWidth={1.8} />
            <span style={{ fontWeight: 500 }}>User management</span>
          </Link>
        </nav>

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
            <h1 className="topbar-title">{title ?? activeLabel}</h1>
          </div>
          {headerCenter && <div className="topbar-center">{headerCenter}</div>}
          {headerActions && <div className="topbar-right">{headerActions}</div>}
        </header>
        {children}

        {/* Mobile "More" Navigation Bottom Sheet */}
        {moreSheetOpen && (
          <div className="mobile-more-backdrop" onClick={() => setMoreSheetOpen(false)}>
            <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-more-header">
                <span className="mobile-more-title">More Navigation</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setMoreSheetOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mobile-more-links">
                <Link
                  href="/audit"
                  className={`mobile-more-item ${pathname.startsWith('/audit') ? 'active' : ''}`}
                  onClick={() => setMoreSheetOpen(false)}
                >
                  <div className="mobile-more-icon"><ClipboardList size={18} /></div>
                  <div className="mobile-more-text">
                    <strong>Audit Log</strong>
                    <small>Compliance & system activity trail</small>
                  </div>
                </Link>

                <Link
                  href="/users"
                  className={`mobile-more-item ${pathname.startsWith('/users') ? 'active' : ''}`}
                  onClick={() => setMoreSheetOpen(false)}
                >
                  <div className="mobile-more-icon"><ShieldCheck size={18} /></div>
                  <div className="mobile-more-text">
                    <strong>User Management</strong>
                    <small>Team accounts & role matrix</small>
                  </div>
                </Link>
              </div>

              <div className="mobile-more-footer">
                <button
                  type="button"
                  className="mobile-signout-btn"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`} onClick={() => setMoreSheetOpen(false)}>
            <LayoutDashboard size={19} strokeWidth={pathname === '/' ? 2.3 : 1.8} />
            <span>Overview</span>
          </Link>
          <Link href="/customers" className={`mobile-nav-item ${pathname.startsWith('/customers') ? 'active' : ''}`} onClick={() => setMoreSheetOpen(false)}>
            <Users size={19} strokeWidth={pathname.startsWith('/customers') ? 2.3 : 1.8} />
            <span>Customers</span>
          </Link>
          <Link href="/sensors" className={`mobile-nav-item ${pathname.startsWith('/sensors') ? 'active' : ''}`} onClick={() => setMoreSheetOpen(false)}>
            <Boxes size={19} strokeWidth={pathname.startsWith('/sensors') ? 2.3 : 1.8} />
            <span>Sensors</span>
          </Link>
          <Link href="/reports" className={`mobile-nav-item ${pathname.startsWith('/reports') ? 'active' : ''}`} onClick={() => setMoreSheetOpen(false)}>
            <FileBarChart size={19} strokeWidth={pathname.startsWith('/reports') ? 2.3 : 1.8} />
            <span>Reports</span>
          </Link>
          <button
            type="button"
            className={`mobile-nav-item ${moreSheetOpen || pathname.startsWith('/audit') || pathname.startsWith('/users') ? 'active' : ''}`}
            onClick={() => setMoreSheetOpen(!moreSheetOpen)}
            aria-label="More navigation options"
          >
            <MoreHorizontal size={19} strokeWidth={moreSheetOpen || pathname.startsWith('/audit') || pathname.startsWith('/users') ? 2.3 : 1.8} />
            <span>More</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
