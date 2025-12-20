
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

// Use 'let' so we can clear these arrays when server data arrives
let LOCAL_NEW_ENTRIES: Entry[] = [];
let LOCAL_NEW_APPOINTMENTS: Appointment[] = [];

let DATA_CACHE: {
    options: any | null;
    packages: ServicePackage[] | null;
    entries: Entry[] | null;
    appointments: Appointment[] | null;
    lastFetch: { [key: string]: number };
} = {
    options: null,
    packages: null,
    entries: null,
    appointments: null,
    lastFetch: {}
};

const CACHE_DURATION = 5 * 60 * 1000;
const OPTIONS_CACHE_DURATION = 15 * 60 * 1000;

export const api = {
  getOptions: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && DATA_CACHE.options && (now - (DATA_CACHE.lastFetch['options'] || 0) < OPTIONS_CACHE_DURATION)) return DATA_CACHE.options;
    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOptions`);
        const data = await response.json();
        if (data && data.clients) {
            const result = { clients: data.clients, technicians: data.technicians || MOCK_TECHNICIANS, items: data.items || MOCK_ITEMS };
            DATA_CACHE.options = result;
            DATA_CACHE.lastFetch['options'] = now;
            return result;
        }
      } catch (e) { console.warn("Fallback to mock options", e); }
    }
    return { clients: MOCK_CLIENTS, technicians: MOCK_TECHNICIANS, items: MOCK_ITEMS };
  },

  addClient: async (client: Client) => {
    DATA_CACHE.options = null;
    if (isLive) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addClient', ...client }) }).catch(err => console.error("Sync Error", err));
    else MOCK_CLIENTS.push(client);
    return client;
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const newEntry = { ...entry, id: 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5) };
    LOCAL_NEW_ENTRIES.push(newEntry as Entry);
    if (isLive) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addEntry', ...entry }) }).catch(e => console.error("Sync Error", e));
    else MOCK_ENTRIES.push(newEntry as Entry);
    return newEntry;
  },

  getEntries: async (forceRefresh = false) => {
    let allEntries: Entry[] = [];
    const now = Date.now();
    if (!forceRefresh && DATA_CACHE.entries && (now - (DATA_CACHE.lastFetch['entries'] || 0) < CACHE_DURATION)) {
        allEntries = DATA_CACHE.entries;
    } else if (isLive) {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEntries`);
            const data = await response.json();
            if (Array.isArray(data)) { 
                allEntries = data; 
                DATA_CACHE.entries = data; 
                DATA_CACHE.lastFetch['entries'] = now;
                // CRITICAL FIX: Clear local temporary items once server data is successfully fetched
                LOCAL_NEW_ENTRIES = [];
            }
        } catch (e) { allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES]; }
    } else { allEntries = [...MOCK_ENTRIES]; }
    
    // If we still have local entries (e.g. offline or just added), merge them safely
    const serverIds = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverIds.has(e.id));
    return [...uniqueLocal, ...allEntries];
  },

  updateEntry: async (entry: Entry) => {
    if (isLive) {
        try { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editEntry', ...entry }) }); }
        catch(e) { console.error("Update Fail", e); throw e; }
    }
    if (DATA_CACHE.entries) {
        const item = DATA_CACHE.entries.find(e => e.id === entry.id);
        if (item) Object.assign(item, entry);
    }
    return true;
  },

  updatePaymentFollowUp: async (payload: { id: string, clientName: string, contactNo?: string, address?: string, paymentMethod?: string, pendingAmount?: number, nextCallDate?: string, remark?: string, screenshotBase64?: string, existingScreenshotUrl?: string, paidAmount?: number }) => {
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updatePaymentFollowUp', ...payload }) });
              const data = await res.json();
              if(DATA_CACHE.entries) {
                const entry = DATA_CACHE.entries.find(e => e.id === payload.id);
                if(entry) {
                    if(payload.paymentMethod) entry.paymentMethod = payload.paymentMethod as any;
                    if(payload.pendingAmount !== undefined) entry.pendingAmount = payload.pendingAmount;
                    if(payload.nextCallDate) entry.nextCallDate = payload.nextCallDate;
                    if(payload.remark) entry.remark = payload.remark;
                    if(data.screenshotUrl) entry.paymentScreenshotUrl = data.screenshotUrl;
                }
              }
              return data;
          } catch(e) { throw e; }
      }
      return { status: "success" };
  },

  getAppointments: async (forceRefresh = false) => {
    let allAppts: Appointment[] = [];
    const now = Date.now();
    if (!forceRefresh && DATA_CACHE.appointments && (now - (DATA_CACHE.lastFetch['appointments'] || 0) < CACHE_DURATION)) {
        allAppts = DATA_CACHE.appointments;
    } else if (isLive) {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAppointments`);
            const data = await response.json();
            if (Array.isArray(data)) { 
                allAppts = data; 
                DATA_CACHE.appointments = data; 
                DATA_CACHE.lastFetch['appointments'] = now; 
                // CRITICAL FIX: Clear local temporary items once server data is successfully fetched
                LOCAL_NEW_APPOINTMENTS = [];
            }
        } catch (e) { allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS]; }
    } else { allAppts = [...MOCK_APPOINTMENTS]; }
    
    const serverIds = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverIds.has(a.id));
    return [...uniqueLocal, ...allAppts];
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const newAppt = { ...appt, id: 'temp_' + Date.now() };
    LOCAL_NEW_APPOINTMENTS.push(newAppt as Appointment);
    if (isLive) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addAppointment', ...appt }) }).catch(e => console.error(e));
    else MOCK_APPOINTMENTS.push(newAppt as Appointment);
    return newAppt;
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    if (DATA_CACHE.appointments) {
        const item = DATA_CACHE.appointments.find(a => a.id === id);
        if (item) item.status = status;
    }
    if (isLive) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateAppointmentStatus', id, status }) });
    return true;
  },

  getPackages: async (forceRefresh = false) => {
      const now = Date.now();
      if (!forceRefresh && DATA_CACHE.packages && (now - (DATA_CACHE.lastFetch['packages'] || 0) < CACHE_DURATION)) return DATA_CACHE.packages;
      if (isLive) {
          try {
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPackages&t=${now}`);
              const data = await response.json();
              if (Array.isArray(data)) {
                  const formattedData = data.map((pkg: any) => ({ ...pkg, status: pkg.status ? pkg.status : 'PENDING' }));
                  DATA_CACHE.packages = formattedData;
                  DATA_CACHE.lastFetch['packages'] = now;
                  return formattedData;
              }
          } catch (e) { console.warn(e); }
      }
      return [...MOCK_PACKAGES];
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
      DATA_CACHE.packages = null;
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addPackage', ...pkg, status: 'PENDING' }) });
      return true;
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null;
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updatePackageStatus', id, status }) });
      return true;
  },
  
  deletePackage: async (id: string) => {
      DATA_CACHE.packages = null;
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deletePackage', id }) });
      return true;
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null;
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editPackage', ...pkg }) });
      return true;
  },

  checkClientPackage: async (clientName: string, contact?: string) => {
      if (!clientName) return null;
      const normalizedName = clientName.trim().toLowerCase();
      const packages = await api.getPackages();
      const pkg = packages.find((p: any) => {
          const matchName = p.clientName.trim().toLowerCase() === normalizedName;
          const matchContact = contact ? String(p.contact || '').includes(contact) : true;
          return matchName && matchContact && (p.status === 'ACTIVE' || p.status === 'APPROVED');
      });
      if (!pkg) return null;
      const entries = await api.getEntries();
      const pkgStartDate = new Date(pkg.startDate); pkgStartDate.setHours(0,0,0,0);
      const usedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date); entryDate.setHours(0,0,0,0);
          return (e.clientName.trim().toLowerCase() === normalizedName && entryDate >= pkgStartDate && (e.serviceType === 'SERVICE') && (e.workStatus === 'DONE' || e.workStatus === 'PENDING_APPROVAL'));
      }).length;
      return { package: pkg, usedCount, currentServiceNumber: usedCount + 1, isExpired: usedCount + 1 > pkg.totalServices, remaining: Math.max(0, pkg.totalServices - usedCount) };
  },

  getUsers: async () => {
      if (isLive) {
          try {
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers`);
              const data = await response.json();
              if (Array.isArray(data)) return data.map((u: any) => ({ ...u, permissions: u.permissions ? u.permissions.split(',') : [] }));
          } catch (e) { console.warn(e); }
      }
      return [];
  },

  addUser: async (user: User & { password: string }) => {
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addUser', ...user, permissions: user.permissions ? user.permissions.join(',') : '' }) });
      return true;
  },

  updateUser: async (user: User & { password?: string }) => {
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editUser', ...user, permissions: user.permissions ? user.permissions.join(',') : '' }) });
      return true;
  },
  
  deleteUser: async (username: string) => {
       if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteUser', username }) });
       return true;
  },

  updateUserProfile: async (payload: { username: string, dpUrl?: string, gender?: string, dob?: string, address?: string }) => {
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateUserProfile', ...payload }) });
              return await res.json();
          } catch (e) { console.error("Failed to update profile", e); throw e; }
      }
      return { status: "success" };
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const [entries, options] = await Promise.all([
        api.getEntries(true),
        api.getOptions(true)
    ]);
    const totalClients = options.clients ? options.clients.length : 0;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const serviceCount = entries.length;
    const totalOutstanding = entries.reduce((sum: number, e: any) => sum + Number(e.pendingAmount || 0), 0);
    return { totalClients, totalAmount, newClientsToday, serviceCount, totalOutstanding };
  }
};
