import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Eye,
  Gauge,
  MessageCircle,
  Crosshair,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
  section: 'Core' | 'Compliance' | 'AI & Ops' | 'System';
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Command Centre', href: '/dashboard', icon: LayoutDashboard, section: 'Core' },
  { label: 'Leads', href: '/dashboard/leads', icon: Users, badge: 12, section: 'Core' },
  { label: 'Audit Engine', href: '/dashboard/audit', icon: ShieldCheck, section: 'Compliance' },
  { label: 'Watchtower', href: '/dashboard/watchtower', icon: Eye, badge: 3, section: 'Compliance' },
  { label: 'Lead Scoring', href: '/dashboard/scoring', icon: Gauge, section: 'AI & Ops' },
  { label: 'WhatsApp AI', href: '/dashboard/whatsapp', icon: MessageCircle, section: 'AI & Ops' },
  { label: 'Intel', href: '/dashboard/competitors', icon: Crosshair, section: 'AI & Ops' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'System' },
];
