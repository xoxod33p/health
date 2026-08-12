'use client';

import { Activity, Bell, Boxes, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users } from 'lucide-react';
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
  const cachedSession = getCachedSession();
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'error'>(cachedSession ? 'ready' : 'loading');
  const [email, setEmail] = useState(cachedSession?.user.email ?? '');
  const [role, setRole] = useState(cachedSession?.user.role ?? 'SYSTEM_ADMIN');
  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? (pathname.startsWith('/users') ? 'User management' : pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/notifications') ? 'Notifications' : 'Workspace');

  useEffect(() => {
    let mounted = true;
    void getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.session) {
        router.replace('/login');
        return;
      }
      setEmail(data.session.user.email ?? '');
      setRole(data.session.user.role ?? 'SYSTEM_ADMIN');
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
        <div className="brand-row">
          <div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div>
          <span className="brand-name">care<span>signal</span></span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className={`nav-item ${activeLabel === label ? 'nav-active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
          <span className="nav-label nav-label-spaced">Manage</span>
          <Link className={`nav-item ${activeLabel === 'User management' ? 'nav-active' : ''}`} href="/users" onClick={() => setSidebarOpen(false)}>
            <Users size={18} />
            <span>User management</span>
          </Link>
          <Link className={`nav-item ${activeLabel === 'Notifications' ? 'nav-active' : ''}`} href="/notifications" onClick={() => setSidebarOpen(false)}>
            <Bell size={18} />
            <span>Notifications</span>
          </Link>
          <Link className={`nav-item ${activeLabel === 'Settings' ? 'nav-active' : ''}`} href="/settings" onClick={() => setSidebarOpen(false)}>
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer with Highly Visible Sign Out Button */}
        <div className="sidebar-footer" style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="profile-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
              {email.slice(0, 2).toUpperCase() || 'ME'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>
                {email || 'User'}
              </strong>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={11} /> {role.replace('_', ' ')}
              </span>
            </div>
          </div>

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
