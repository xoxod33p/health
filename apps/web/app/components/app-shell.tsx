'use client';

import { Activity, Bell, Boxes, ChevronDown, ClipboardList, FileBarChart, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Sensors', href: '/sensors', icon: Boxes },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Audit log', href: '/audit', icon: ClipboardList },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? (pathname.startsWith('/team') ? 'Team' : pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/notifications') ? 'Notifications' : 'Workspace');

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div><span className="brand-name">care<span>signal</span></span><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="workspace-select"><div className="workspace-avatar">NC</div><div><strong>Northstar Care</strong><span>Operations workspace</span></div><ChevronDown size={16} /></div>
      <nav className="main-nav" aria-label="Main navigation"><span className="nav-label">Workspace</span>{navigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className={`nav-item ${activeLabel === label ? 'nav-active' : ''}`} onClick={() => setSidebarOpen(false)}><Icon size={18} /><span>{label}</span>{label === 'Customers' && <small>1,248</small>}</Link>)}<span className="nav-label nav-label-spaced">Manage</span><Link className={`nav-item ${activeLabel === 'Notifications' ? 'nav-active' : ''}`} href="/notifications" onClick={() => setSidebarOpen(false)}><Bell size={18} /><span>Notifications</span><small>4</small></Link><Link className={`nav-item ${activeLabel === 'Team' ? 'nav-active' : ''}`} href="/team" onClick={() => setSidebarOpen(false)}><Users size={18} /><span>Team</span></Link><Link className={`nav-item ${activeLabel === 'Settings' ? 'nav-active' : ''}`} href="/settings" onClick={() => setSidebarOpen(false)}><Settings size={18} /><span>Settings</span></Link></nav>
      <div className="sidebar-footer"><div className="secure-note"><ShieldCheck size={16} /><span>Protected workspace<br /><b>All systems operational</b></span></div><div className="profile-row"><div className="profile-avatar">OC</div><div><strong>Olivia Chen</strong><span>Company admin</span></div></div></div>
    </aside>
    <main className="content-shell"><header className="topbar"><button className="icon-button menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeLabel}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={19} /></button><Link className="notification-button" href="/notifications" aria-label="Notifications"><Bell size={19} /><i>4</i></Link><div className="topbar-avatar">OC</div></div></header>{children}</main>
  </div>;
}
