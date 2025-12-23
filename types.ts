
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  username: string;
  role: Role;
  department?: string;
  permissions?: string[]; // Array of paths allowed e.g. ['/new-entry', '/daily-report']
  // New Profile Fields
  dpUrl?: string;
  gender?: string;
  dob?: string;
  address?: string;
}

export interface Client {
  name: string;
  contact: string;
  address: string;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  dob: string;
}

export interface Entry {
  id: string;
  date: string;
  clientName: string;
  contactNo: string;
  address: string;
  branch: 'RPR' | 'JDP';
  serviceType: 'SERVICE' | 'NEW' | 'DEMO' | 'MUNDAN' | 'WASHING';
  patchMethod: 'TAPING' | 'BONDING' | 'CLIPPING' | '';
  technician: string;
  workStatus: 'PENDING' | 'DONE' | 'FOLLOWUP' | 'PENDING_APPROVAL' | 'REJECTED';
  amount: number;
  paymentMethod: 'UPI' | 'CASH' | 'CARD' | 'PENDING';
  remark: string;
  numberOfService: number;
  patchSize?: string; // Optional, only if NEW
  invoiceUrl?: string; // PDF Link
  pendingAmount?: number; // Partial payments
  
  // NEW FIELDS FOR FOLLOW UP
  paymentScreenshotUrl?: string; // Col Q
  nextCallDate?: string; // Col R
}

export interface Appointment {
  id: string;
  date: string;
  clientName: string;
  contact: string;
  address: string;
  note: string;
  status: 'PENDING' | 'FOLLOWUP' | 'CLOSED';
  branch?: string;
  time?: string;
}

export interface Item {
  code: string;
  name: string;
  category: string;
}

export interface Technician {
  name: string;
  contact: string;
}

export interface DashboardStats {
  totalClients: number;
  totalAmount: number;
  newClientsToday: number;
  serviceCount: number;
  totalOutstanding: number;
}

export interface ServicePackage {
  id: string;
  clientName: string;
  contact: string;
  packageName: string; // e.g. "Annual Maintenance"
  totalCost: number;
  totalServices: number;
  startDate: string;
  status: 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'PENDING' | 'REJECTED';
}
