'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Moon,
  Sun,
  MessageCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NAV_ITEMS, type NavItem } from '@/lib/dashboard/navigation';

// ── Internal NavLink component ──────────────────────────────────────────────
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
      <Icon size={18} />
      <span>{item.label}</span>
      {item.badge && <span className="sidebar-badge">{item.badge}</span>}
    </Link>
  );
}

// ── Internal Sidebar component (memoized) ───────────────────────────────────
const Sidebar = React.memo(function Sidebar({
  pathname,
  sidebarOpen,
  onClose,
}: {
  pathname: string;
  sidebarOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <svg className="logo-mark" viewBox="0 0 32 32" fill="none" aria-label="ShadowSpark logo">
          <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
          <path d="M8 22 L14 10 L16 15 L20 8 L24 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="16" cy="15" r="2" fill="white" />
        </svg>
        <div className="logo-text-group">
          <div className="logo-text">ShadowSpark</div>
          <div className="logo-sub">Command Centre</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {(['Core', 'Compliance', 'AI & Ops', 'System'] as const).map(section => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {NAV_ITEMS.filter(item => item.section === section).map(item => (
              <NavLink key={item.href} item={item} active={pathname === item.href} />
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar-row">
          <div className="avatar">S</div>
          <div>
            <div className="avatar-name">Stephen</div>
            <div className="avatar-role">ARCHITECT</div>
          </div>
        </div>
      </div>
    </aside>
  );
});

// ── Internal Topbar component ───────────────────────────────────────────────
function Topbar({
  pathname,
  dark,
  onToggleTheme,
  onMenuClick,
}: {
  pathname: string;
  dark: boolean;
  onToggleTheme: () => void;
  onMenuClick: () => void;
}) {
  const currentLabel = useMemo(() => {
    const match = NAV_ITEMS.find(item => item.href === pathname);
    return match?.label ?? 'Command Centre';
  }, [pathname]);

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div>
          <div className="page-title" id="page-title">{currentLabel}</div>
          <div className="page-subtitle">Friday, 1 May 2026 · Owerri, NG</div>
        </div>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="icon-btn" aria-label="Toggle theme" onClick={onToggleTheme}>
          {dark ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <Link href="/dashboard/whatsapp" className="btn btn-primary">
          <MessageCircle size={15} /> WhatsApp
        </Link>
      </div>
    </header>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const toggleTheme = useCallback(() => {
    setDark(prev => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="dashboard-root">
      <Sidebar pathname={pathname} sidebarOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* Main */}
      <div className="dashboard-main">
        <Topbar
          pathname={pathname}
          dark={dark}
          onToggleTheme={toggleTheme}
          onMenuClick={openSidebar}
        />

        {/* Content */}
        <main className="dashboard-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
