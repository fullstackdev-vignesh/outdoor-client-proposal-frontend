export type Role = 'admin' | 'tl' | 'user' | 'bd';

export type MediaStatus = 'available' | 'booked' | 'blocked';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface BookingInfo {
  bookingId?: string;
  customerType?: 'client' | 'agency';
  client?: { _id: string; name: string } | string;
  bookingRef?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  monthlyTotalCost?: number;
  amount?: number;
  bookedBy?: string;
}

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface BookingRecord {
  bookingId: string;
  customerType: 'client' | 'agency';
  client: { _id: string; name: string } | string;
  customerName?: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  monthlyTotalCost?: number;
  amount?: number;
  status: BookingStatus;
  createdAt?: string;
  updatedAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledByName?: string;
  cancelledByRole?: string;
}

export interface BlockInfo {
  reason?: string;
  notes?: string;
  blockedDate?: string;
  blockedBy?: { _id: string; name: string } | string;
}

export interface Site {
  _id: string;
  mediaId: string;
  mediaCode?: string;
  mediaName?: string;
  mediaType: string;
  quantity?: number;
  state: string;
  city: string;
  location?: string;
  areaName?: string;
  locationDetails?: string;
  siteOwner?: string;
  latitude?: number;
  longitude?: number;
  illumination?: string;
  width?: number;
  height?: number;
  sizeUnit?: string;
  autoSize?: number;
  amount?: number;
  gstAmount?: number;
  monthlyAmount?: number;
  printingCost?: number;
  mountingCost?: number;
  totalCost?: number;
  mediaImage?: string;
  siteInfoId?: SiteInfo | string | null;
  isActive: boolean;
  mediaStatus: MediaStatus;
  bookingInfo?: BookingInfo;
  bookings?: BookingRecord[];
  blockInfo?: BlockInfo;
  createdAt: string;
  updatedAt?: string;
  inventoryUpdatedAt?: string;
}

export interface SiteInfo {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteHistoryEntry {
  _id: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy?: { _id: string; name: string } | string;
  changedAt: string;
}

export interface InventoryHistoryEntry {
  _id: string;
  site: string;
  // Timeline list only (one row per site): how many history entries this site has.
  changeCount?: number;
  mediaId: string;
  mediaType?: string;
  state?: string;
  city?: string;
  mediaImage?: string;
  siteOwner?: string;
  status: MediaStatus | 'cancelled';
  previousStatus?: MediaStatus | null;
  isActive?: boolean;
  bookingId?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changedAt: string;
  changedBy?: { _id: string; name: string } | string;
  source: 'sites' | 'inventory';
  bookingSnapshot?: {
    customerType?: 'client' | 'agency';
    client?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    monthlyTotalCost?: number;
    amount?: number;
  };
  blockSnapshot?: {
    reason?: string;
    notes?: string;
    blockedDate?: string;
  };
  cancellationSnapshot?: {
    reason?: string;
    cancelledAt?: string;
    cancelledByName?: string;
    cancelledByRole?: string;
  };
}

export interface Client {
  _id: string;
  customerType?: 'client' | 'agency';
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  agencyComm?: number;
  gst?: number;
  clientLocationPinImage?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  _id: string;
  bookingId: string;
  client: { _id: string; name: string } | string;
  sites: Site[] | string[];
  startDate: string;
  endDate: string;
  amount?: number;
  gstAmount?: number;
  totalAmount?: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Proposal {
  _id: string;
  proposalId: string;
  client: { _id: string; name: string } | string;
  sites: Site[] | string[];
  pptTemplate?: { _id: string; name: string } | string;
  excelTemplate?: { _id: string; name: string } | string;
  variant?: string;
  totalAmount?: number;
  gstAmount?: number;
  monthlyAmount?: number;
  status: 'draft' | 'generated' | 'completed';
  generatedPptUrl?: string;
  generatedPptWithLocationUrl?: string;
  generatedPptWithoutLocationUrl?: string;
  generatedExcelUrl?: string;
  createdAt: string;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  version: string;
  variant?: string;
  fileUrl?: string;
  /** Which entry in the backend's *TemplateConfigs.js drives generation for this file's layout. */
  formatKey?: string;
  status: 'active' | 'inactive';
  usedCount: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
