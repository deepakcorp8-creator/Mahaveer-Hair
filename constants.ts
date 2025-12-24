
import { Client, Entry, Item, Technician, Appointment, ServicePackage } from './types';

// Mock Clients (Fallback Data)
export const MOCK_CLIENTS: Client[] = [
  { name: 'Manish Gupta', contact: '9584801901', address: 'Umaiyara', gender: 'Male', email: 'manish@example.com', dob: '1990-01-01' },
  { name: 'A.P. Tiwari', contact: '9876543210', address: 'Bilaspur', gender: 'Male', email: 'ap@example.com', dob: '1985-05-20' },
  { name: 'Sita Verma', contact: '7778889990', address: 'Raipur', gender: 'Female', email: 'sita@example.com', dob: '1992-11-15' },
];

// Mock Technicians
export const MOCK_TECHNICIANS: Technician[] = [
  { name: 'Sonu', contact: '9000011111' },
  { name: 'Jitendra Gupta', contact: '9000022222' },
  { name: 'Kanhaiya Pagare', contact: '9000033333' },
  { name: 'Ravi Kumar', contact: '9000044444' },
  { name: 'Amit Singh', contact: '9000055555' },
];

export const MOCK_ITEMS: Item[] = [
  { code: 'MHS-RPR/0', name: 'R.MONO 7X5', category: 'R.MONO' },
  { code: 'MHS-RPR/1', name: 'R.MONO 8X6', category: 'R.MONO' },
  { code: 'MHS-RPR/3', name: 'Q6 7X5', category: 'Q6' },
  { code: 'MHS-RPR/7', name: 'BW 7X5', category: 'BW' },
];

export const MOCK_ENTRIES: Entry[] = [];
export const MOCK_APPOINTMENTS: Appointment[] = [];
export const MOCK_PACKAGES: ServicePackage[] = [];

// =========================================================================================
// ⚠️ PASTE YOUR NEW WEB APP URL HERE
// =========================================================================================
export const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbzLb_7mUPJ_rBgs_N7XqQariehRb6MI46leaqaw-dpc7HnPsOL4Ne6iIXaq5sEBd63a6A/exec'; 
