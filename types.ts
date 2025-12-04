export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  username: string;
  role: Role;
  department?: string;
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
  branch: 'BSP' | 'RPR';
  serviceType: 'SERVICE' | 'NEW' | 'DEMO' | 'MUNDAN';
  patchMethod: 'TAPING' | 'BONDING' | 'CLIPPING' | '';
  technician: string;
  workStatus: 'PENDING' | 'DONE' | 'FOLLOWUP';
  amount: number;
  paymentMethod: 'UPI' | 'CASH' | 'CARD' | 'PENDING';
  remark: string;
  numberOfService: number;
  patchSize?: string; // Optional, only if NEW
}

export interface Appointment {
  id: string;
  date: string;
  clientName: string;
  contact: string;
  note: string;
  status: 'PENDING' | 'FOLLOWUP' | 'CLOSED';
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
}

export interface ServicePackage {
  id: string;
  clientName: string;
  contact: string;
  packageName: string; // e.g. "Annual Maintenance"
  totalCost: number;
  totalServices: number;
  startDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
}
