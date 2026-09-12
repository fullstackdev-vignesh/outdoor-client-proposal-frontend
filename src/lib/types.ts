export type Role = 'admin' | 'tl' | 'user' | 'bd';

export type MediaStatus = 'available' | 'booked' | 'blocked';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface BookingInfo {
  client?: { _id: string; name: string } | string;
  bookingRef?: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  bookedBy?: string;
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
  mediaName: string;
  mediaType: string;
  state: string;
  city: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
  sizeUnit?: string;
  amount?: number;
  gstAmount?: number;
  monthlyAmount?: number;
  image?: string;
  isActive: boolean;
  mediaStatus: MediaStatus;
  bookingInfo?: BookingInfo;
  blockInfo?: BlockInfo;
  createdAt: string;
}

export interface Client {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
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
  variant: string;
  totalAmount?: number;
  gstAmount?: number;
  monthlyAmount?: number;
  status: 'draft' | 'generated' | 'completed';
  generatedPptUrl?: string;
  generatedExcelUrl?: string;
  createdAt: string;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  version: string;
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
