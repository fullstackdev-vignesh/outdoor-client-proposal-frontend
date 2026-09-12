import type { Role } from './types';
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserCheck,
  Building2,
  Contact2,
  Presentation,
  FileSpreadsheet,
  FileText,
  CalendarCheck,
  BarChart3,
  Settings,
  Search,
  FolderOutput,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'TL Management', href: '/tl-management', icon: UserCog },
    { label: 'BD Management', href: '/bd-management', icon: UserCheck },
    { label: 'Site / Media', href: '/sites', icon: Building2 },
    { label: 'Clients', href: '/clients', icon: Contact2 },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    { label: 'Proposals', href: '/proposals', icon: FileText },
  ],
  tl: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Sites / Media', href: '/sites', icon: Building2 },
    { label: 'Clients', href: '/clients', icon: Contact2 },
    { label: 'Bookings', href: '/bookings', icon: CalendarCheck },
    { label: 'Proposals', href: '/proposals', icon: FileText },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Reports', href: '/reports', icon: BarChart3 },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
  user: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Clients', href: '/clients', icon: Contact2 },
    { label: 'Sites / Media', href: '/sites', icon: Building2 },
    { label: 'Available Media', href: '/available-media', icon: Search },
    { label: 'Proposals', href: '/proposals', icon: FileText },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    // { label: 'Generated Files', href: '/generated-files', icon: FolderOutput },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
  bd: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Clients', href: '/clients', icon: Contact2 },
    { label: 'Sites / Media', href: '/sites', icon: Building2 },
    { label: 'Available Media', href: '/available-media', icon: Search },
    { label: 'Proposals', href: '/proposals', icon: FileText },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    // { label: 'Generated Files', href: '/generated-files', icon: FolderOutput },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
};

export function getNavForRole(role: Role): NavItem[] {
  return NAV[role] || NAV.user;
}
