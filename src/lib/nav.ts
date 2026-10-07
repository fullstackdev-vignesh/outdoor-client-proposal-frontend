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
  ClipboardList,
  Signpost,
  ReceiptText,
  Boxes,
  Handshake,
  IndianRupee,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory Master', href: '/inventory', icon: Boxes },
    { label: 'Proposal Master', href: '/proposals', icon: Handshake },
    { label: 'Client Master', href: '/clients', icon: Contact2 },
    { label: 'Media Master', href: '/sites', icon: Signpost },
    { label: 'Site Quotes Master', href: '/site-info', icon: ReceiptText },
    { label: 'Rate Master', href: '/rate-master', icon: IndianRupee },
    { label: 'User Management', href: '/users', icon: Users },
    { label: 'TL Management', href: '/tl-management', icon: UserCog },
    { label: 'BD Management', href: '/bd-management', icon: UserCheck },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },

  ],
  tl: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory Master', href: '/inventory', icon: Boxes },
    { label: 'Proposal Master', href: '/proposals', icon: Handshake },
    // { label: 'Users', href: '/users', icon: Users },
    { label: 'Client Master', href: '/clients', icon: Contact2 },
    { label: 'Media Master', href: '/sites', icon: Signpost },
    { label: 'Site Quotes Master', href: '/site-info', icon: ReceiptText },


    // { label: 'Bookings', href: '/bookings', icon: CalendarCheck },

    //  { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Reports', href: '/reports', icon: BarChart3 },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
  user: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory Master', href: '/inventory', icon: Boxes },
    { label: 'Proposal Master', href: '/proposals', icon: Handshake },

    { label: 'Client Master', href: '/clients', icon: Contact2 },
    { label: 'Media Master', href: '/sites', icon: Signpost },
    { label: 'Site Quotes Master', href: '/site-info', icon: ReceiptText },

    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    // { label: 'Generated Files', href: '/generated-files', icon: FolderOutput },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
  bd: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory Master', href: '/inventory', icon: Boxes },
    // { label: 'Clients', href: '/clients', icon: Contact2 },
    { label: 'Media Master', href: '/sites', icon: Signpost },
    // { label: 'Site Info', href: '/site-info', icon: ClipboardList },

    // { label: 'Available Media', href: '/available-media', icon: Search },
    // { label: 'Proposals', href: '/proposals', icon: FileText },
    // { label: 'PPT Master', href: '/ppt-master', icon: Presentation },
    // { label: 'Excel Templates', href: '/excel-templates', icon: FileSpreadsheet },
    // { label: 'Generated Files', href: '/generated-files', icon: FolderOutput },
    // { label: 'Settings', href: '/settings', icon: Settings },
  ],
};

export function getNavForRole(role: Role): NavItem[] {
  return NAV[role] || NAV.user;
}
