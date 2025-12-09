import { Client, Entry, Item, Technician, Appointment, ServicePackage } from './types';

// Expanded Mock Clients (REALISTIC DATA)
export const MOCK_CLIENTS: Client[] = [
  { name: 'Manish Gupta', contact: '9584801901', address: 'Umaiyara', gender: 'Male', email: 'manish@example.com', dob: '1990-01-01' },
  { name: 'A.P. Tiwari', contact: '9876543210', address: 'Bilaspur', gender: 'Male', email: 'ap@example.com', dob: '1985-05-20' },
  { name: 'Sita Verma', contact: '7778889990', address: 'Raipur', gender: 'Female', email: 'sita@example.com', dob: '1992-11-15' },
  { name: 'Rahul Sharma', contact: '9988776655', address: 'Bhilai', gender: 'Male', email: 'rahul@gmail.com', dob: '1988-03-10' },
  { name: 'Priya Singh', contact: '8877665544', address: 'Korba', gender: 'Female', email: 'priya@yahoo.com', dob: '1995-07-22' },
  { name: 'Vikram Yadav', contact: '7766554433', address: 'Durg', gender: 'Male', email: 'vikram@hotmail.com', dob: '1982-12-05' },
  { name: 'Anjali Das', contact: '6655443322', address: 'Raipur', gender: 'Female', email: 'anjali@example.com', dob: '1998-09-18' },
  { name: 'Rakesh Sahu', contact: '5544332211', address: 'Raigarh', gender: 'Male', email: 'rakesh@example.com', dob: '1979-04-30' },
  { name: 'Suresh Patel', contact: '9123456780', address: 'Jagdalpur', gender: 'Male', email: 'suresh@example.com', dob: '1986-06-12' },
  { name: 'Deepak Kumar', contact: '9988112233', address: 'Raipur', gender: 'Male', email: 'deepak@example.com', dob: '1991-01-15' },
  { name: 'Amit Trivedi', contact: '8811223344', address: 'Bilaspur', gender: 'Male', email: 'amit@example.com', dob: '1989-11-20' },
  { name: 'Neha Gupta', contact: '7711223344', address: 'Bhilai', gender: 'Female', email: 'neha@example.com', dob: '1994-02-28' },
  { name: 'Rohan Mehta', contact: '6611223344', address: 'Durg', gender: 'Male', email: 'rohan@example.com', dob: '1990-08-14' },
  { name: 'Kavita Joshi', contact: '5511223344', address: 'Korba', gender: 'Female', email: 'kavita@example.com', dob: '1993-05-05' },
  { name: 'Rajesh Mishra', contact: '9922334455', address: 'Raipur', gender: 'Male', email: 'rajesh@example.com', dob: '1984-10-10' },
];

// Expanded Technicians
export const MOCK_TECHNICIANS: Technician[] = [
  { name: 'Sonu', contact: '9000011111' },
  { name: 'Jitendra Gupta', contact: '9000022222' },
  { name: 'Kanhaiya Pagare', contact: '9000033333' },
  { name: 'Ravi Kumar', contact: '9000044444' },
  { name: 'Amit Singh', contact: '9000055555' },
  { name: 'Sandeep Sharma', contact: '9000066666' },
  { name: 'Manoj Verma', contact: '9000077777' },
  { name: 'Rajesh Yadav', contact: '9000088888' },
];

export const MOCK_ITEMS: Item[] = [
  { code: 'MHS-RPR/0', name: 'R.MONO 7X5', category: 'R.MONO' },
  { code: 'MHS-RPR/1', name: 'R.MONO 8X6', category: 'R.MONO' },
  { code: 'MHS-RPR/2', name: 'R.MONO 9X6', category: 'R.MONO' },
  { code: 'MHS-RPR/3', name: 'Q6 7X5', category: 'Q6' },
  { code: 'MHS-RPR/4', name: 'Q6 8X6', category: 'Q6' },
  { code: 'MHS-RPR/5', name: 'MIRAGE 7X5', category: 'MIRAGE' },
  { code: 'MHS-RPR/6', name: 'MIRAGE 8X6', category: 'MIRAGE' },
  { code: 'MHS-RPR/7', name: 'BW 7X5', category: 'BW' },
  { code: 'MHS-RPR/8', name: 'BW 8X6', category: 'BW' },
];

// Updated Entries to match new Clients/Technicians exactly
export const MOCK_ENTRIES: Entry[] = [
  {
    id: '1',
    date: '2025-05-01',
    clientName: 'Manish Gupta',
    contactNo: '9584801901',
    address: 'Umaiyara',
    branch: 'RPR',
    serviceType: 'NEW',
    patchMethod: 'BONDING',
    technician: 'Kanhaiya Pagare',
    workStatus: 'DONE',
    amount: 6500,
    paymentMethod: 'CASH',
    remark: 'Happy with service',
    numberOfService: 1,
    patchSize: 'R.MONO 7X5'
  },
  {
    id: '2',
    date: '2025-05-02',
    clientName: 'A.P. Tiwari',
    contactNo: '9876543210',
    address: 'Bilaspur',
    branch: 'BSP',
    serviceType: 'SERVICE',
    patchMethod: 'TAPING',
    technician: 'Sonu',
    workStatus: 'PENDING',
    amount: 500,
    paymentMethod: 'UPI',
    remark: '',
    numberOfService: 5
  },
  {
    id: '3',
    date: '2025-05-02',
    clientName: 'Sita Verma',
    contactNo: '7778889990',
    address: 'Raipur',
    branch: 'RPR',
    serviceType: 'DEMO',
    patchMethod: 'CLIPPING',
    technician: 'Jitendra Gupta',
    workStatus: 'DONE',
    amount: 0,
    paymentMethod: 'CASH',
    remark: 'Demo successful',
    numberOfService: 0
  },
  {
    id: '4',
    date: '2025-05-03',
    clientName: 'Rahul Sharma',
    contactNo: '9988776655',
    address: 'Bhilai',
    branch: 'RPR',
    serviceType: 'SERVICE',
    patchMethod: 'BONDING',
    technician: 'Ravi Kumar',
    workStatus: 'DONE',
    amount: 800,
    paymentMethod: 'CARD',
    remark: 'Regular maintenance',
    numberOfService: 3
  },
  {
    id: '5',
    date: '2025-05-03',
    clientName: 'Priya Singh',
    contactNo: '8877665544',
    address: 'Korba',
    branch: 'BSP',
    serviceType: 'NEW',
    patchMethod: 'CLIPPING',
    technician: 'Amit Singh',
    workStatus: 'FOLLOWUP',
    amount: 12000,
    paymentMethod: 'UPI',
    remark: 'New wig fitting',
    numberOfService: 1,
    patchSize: 'MIRAGE 7X5'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '101', date: '2025-05-05', clientName: 'Manish Gupta', contact: '9584801901', address: 'Umaiyara', note: 'Checkup', status: 'PENDING' },
  { id: '102', date: '2025-05-06', clientName: 'Rakesh Sahu', contact: '5544332211', address: 'Raigarh', note: 'Inquiry for new patch', status: 'FOLLOWUP' },
  { id: '103', date: '2025-05-07', clientName: 'Suresh Patel', contact: '9123456780', address: 'Jagdalpur', note: 'Maintenance', status: 'PENDING' },
  { id: '104', date: '2025-12-04', clientName: 'Sita Verma', contact: '7778889990', address: 'Raipur', note: 'KAL AYEGI', status: 'PENDING' },
  { id: '105', date: '2025-12-25', clientName: 'Vikram Yadav', contact: '7766554433', address: 'Durg', note: 'AUNGA BOLA HAI', status: 'CLOSED' },
];

export const MOCK_PACKAGES: ServicePackage[] = [
    { 
        id: 'p1', 
        clientName: 'A.P. Tiwari', 
        contact: '9876543210', 
        packageName: 'Yearly Value', 
        totalCost: 5999, 
        totalServices: 12, 
        startDate: '2025-01-01',
        status: 'ACTIVE'
    }
];

export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzN4oNNYW6afcg3CtQrzKy5mQl28LPb2X6XW8-J-pVw7lj_fgtmlLvrMVPA5RGwOq90ZQ/exec';