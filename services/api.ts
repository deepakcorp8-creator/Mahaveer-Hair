
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

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

const toDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

const normalizeToISO = (dateStr: string) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    return dateStr;
};

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
    const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
    if (isLive) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addClient', ...formattedClient }) }).catch(err => console.error("Sync Error", err));
    else MOCK_CLIENTS.push(formattedClient);
    return formattedClient;
  },

  updateClient: async (client: Client, originalName: string) => {
      DATA_CACHE.options = null;
      const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
      if (isLive) {
          const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editClient', originalName, ...formattedClient }) });
          return await res.json();
      }
      const idx = MOCK_CLIENTS.findIndex(c => c.name === originalName);
      if (idx !== -1) MOCK_CLIENTS[idx] = formattedClient;
      return { status: "success" };
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const entryWithFormattedDate = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
      try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addEntry', ...entryWithFormattedDate })
        });
        const data = await res.json();
        const savedEntry = { ...entry, id: data.id, invoiceUrl: data.invoiceUrl } as Entry;
        LOCAL_NEW_ENTRIES.push(savedEntry);
        return savedEntry;
      } catch (e) { console.error("Sync Error", e); throw e; }
    } else {
        const mockEntry = { ...entry, id: 'temp_' + Date.now() } as Entry;
        MOCK_ENTRIES.push(mockEntry);
        return mockEntry;
    }
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
                allEntries = data.map((e: any) => ({ ...e, date: normalizeToISO(e.date) }));
                DATA_CACHE.entries = allEntries; 
                DATA_CACHE.lastFetch['entries'] = now;
                LOCAL_NEW_ENTRIES = [];
            }
        } catch (e) { allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES]; }
    } else { allEntries = [...MOCK_ENTRIES]; }
    const serverCheck = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverCheck.has(e.id));
    return [...uniqueLocal, ...allEntries];
  },

  updateEntry: async (entry: Entry) => {
    const formatted = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
        try { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editEntry', ...formatted }) }); }
        catch(e) { console.error("Update Fail", e); throw e; }
    }
    if (DATA_CACHE.entries) {
        const item = DATA_CACHE.entries.find(e => e.id === formatted.id);
        if (item) Object.assign(item, { ...formatted, date: normalizeToISO(formatted.date) });
    }
    return true;
  },

  deleteEntry: async (id: string) => {
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                  body: JSON.stringify({ action: 'deleteEntry', id: String(id) }) 
              });
              const result = await res.json();
              if (result.error) throw new Error(result.error);
              DATA_CACHE.entries = null; // Force reload on next fetch
          } catch (e) { console.error("Delete Fail", e); throw e; }
      } else {
        if (DATA_CACHE.entries) {
            DATA_CACHE.entries = DATA_CACHE.entries.filter(e => e.id !== id);
        }
      }
      return true;
  },

  updatePaymentFollowUp: async (payload: any) => {
      const formattedPayload = { ...payload, nextCallDate: toDDMMYYYY(payload.nextCallDate) };
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updatePaymentFollowUp', ...formattedPayload }) });
              const data = await res.json();
              if(DATA_CACHE.entries) {
                const entry = DATA_CACHE.entries.find(e => e.id === payload.id);
                if(entry) {
                    if(payload.paymentMethod) entry.paymentMethod = payload.paymentMethod as any;
                    if(payload.pendingAmount !== undefined) entry.pendingAmount = payload.pendingAmount;
                    if(payload.nextCallDate) entry.nextCallDate = normalizeToISO(formattedPayload.nextCallDate);
                    if(payload.remark) entry.remark = String(payload.remark);
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
                allAppts = data.map((a: any) => ({ ...a, date: normalizeToISO(a.date) })); 
                DATA_CACHE.appointments = allAppts; 
                DATA_CACHE.lastFetch['appointments'] = now; 
                LOCAL_NEW_APPOINTMENTS = [];
            }
        } catch (e) { allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS]; }
    } else { allAppts = [...MOCK_APPOINTMENTS]; }
    return allAppts;
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const formatted = { ...appt, date: toDDMMYYYY(appt.date) };
    if (isLive) {
        try {
            const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addAppointment', ...formatted }) });
            const data = await res.json();
            const newAppt = { ...formatted, id: data.id } as Appointment;
            LOCAL_NEW_APPOINTMENTS.push(newAppt);
            return newAppt;
        } catch (e) { console.error("Sync Error", e); throw e; }
    } else {
        const mockAppt = { ...formatted, id: 'temp_' + Date.now() } as Appointment;
        MOCK_APPOINTMENTS.push(mockAppt);
        return mockAppt;
    }
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    if (DATA_CACHE.appointments) {
        const item = DATA_CACHE.appointments.find(a => a.id === id);
        if (item) item.status = status;
    }
    if (isLive) {
        try {
            const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateAppointmentStatus', id, status }) });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
        } catch (e) { console.error("Update Status Fail", e); throw e; }
    }
    return true;
  },

  deleteAppointment: async (id: string) => {
    if (isLive) {
        try {
            const res = await fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'deleteAppointment', id: String(id) }) 
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            DATA_CACHE.appointments = null; // Force reload
        } catch (e) { 
            console.error("Delete Appt Fail:", e); 
            throw e; 
        }
    } else {
        if (DATA_CACHE.appointments) {
            DATA_CACHE.appointments = DATA_CACHE.appointments.filter(a => a.id !== id);
        }
    }
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
                  const formattedData = data.map((pkg: any) => ({ ...pkg, startDate: normalizeToISO(pkg.startDate), status: pkg.status ? pkg.status : 'PENDING' }));
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
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addPackage', ...formatted, status: 'PENDING' }) });
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
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editPackage', ...formatted }) });
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
              if (Array.isArray(data)) return data.map((u: any) => ({ ...u, dob: normalizeToISO(u.dob), permissions: u.permissions ? u.permissions.split(',') : [] }));
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

  updateUserProfile: async (payload: any) => {
      const formatted = { ...payload, dob: toDDMMYYYY(payload.dob) };
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateUserProfile', ...formatted }) });
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
