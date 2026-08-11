'use client';

import { Activity, Bell, Boxes, ClipboardList, FileBarChart, LayoutDashboard, Menu, Settings, Users } from 'lucide-react';
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
      setAuthState('ready');
    }).catch(() => { if (mounted) setAuthState('error'); });
    return () => { mounted = false; };
  }, [router]);

  if (authState === 'loading') return <div className="auth-loading"><div className="brand-mark"><Activity size={19} /></div><span>Checking secure session...</span></div>;
  if (authState === 'error') return <div className="auth-loading"><strong>Supabase configuration is missing.</strong><span>Set the frontend environment variables and restart Next.js.</span></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div><span className="brand-name">care<span>signal</span></span></div>
      <nav className="main-nav" aria-label="Main navigation"><span className="nav-label">Workspace</span>{navigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className={`nav-item ${activeLabel === label ? 'nav-active' : ''}`} onClick={() => setSidebarOpen(false)}><Icon size={18} /><span>{label}</span></Link>)}<span className="nav-label nav-label-spaced">Manage</span><Link className={`nav-item ${activeLabel === 'User management' ? 'nav-active' : ''}`} href="/users" onClick={() => setSidebarOpen(false)}><Users size={18} /><span>User management</span></Link><Link className={`nav-item ${activeLabel === 'Notifications' ? 'nav-active' : ''}`} href="/notifications" onClick={() => setSidebarOpen(false)}><Bell size={18} /><span>Notifications</span></Link><Link className={`nav-item ${activeLabel === 'Settings' ? 'nav-active' : ''}`} href="/settings" onClick={() => setSidebarOpen(false)}><Settings size={18} /><span>Settings</span></Link></nav>
      <div className="sidebar-footer"><button className="profile-row" onClick={() => void signOut().then(() => router.replace('/login'))}><div className="profile-avatar">{email.slice(0, 2).toUpperCase() || 'ME'}</div><div><strong>{email || 'Signed-in user'}</strong><span>Sign out</span></div></button></div>
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
  </div>;
}
