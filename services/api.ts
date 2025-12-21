
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

// Helper to check if we have a valid URL
const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

// --- LOCAL CACHE & STATE MANAGEMENT ---
const LOCAL_NEW_ENTRIES: Entry[] = [];
const LOCAL_NEW_APPOINTMENTS: Appointment[] = [];

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
    if (!forceRefresh && DATA_CACHE.options && (now - (DATA_CACHE.lastFetch['options'] || 0) < OPTIONS_CACHE_DURATION)) {
        return DATA_CACHE.options;
    }

    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOptions`);
        const data = await response.json();
        if (data && data.clients) {
            const result = {
                clients: data.clients,
                technicians: data.technicians || MOCK_TECHNICIANS,
                items: data.items || MOCK_ITEMS
            };
            DATA_CACHE.options = result;
            DATA_CACHE.lastFetch['options'] = now;
            return result;
        }
      } catch (e) {
        console.warn("Failed to fetch options", e);
      }
    }
    return { clients: MOCK_CLIENTS, technicians: MOCK_TECHNICIANS, items: MOCK_ITEMS };
  },

  getClientDetails: async (name: string) => {
    const options = await api.getOptions();
    return options.clients.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  },

  addClient: async (client: Client) => {
    DATA_CACHE.options = null;
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addClient', ...client })
        }).catch(err => console.error("BG Sync Error", err));
    } else {
        MOCK_CLIENTS.push(client);
    }
    return client;
  },

  updateClient: async (client: Client, originalName: string) => {
    DATA_CACHE.options = null;
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'editClient', ...client, originalName })
        });
    }
    return true;
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const newEntry = { ...entry, id: 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5) };
    LOCAL_NEW_ENTRIES.push(newEntry as Entry);
    if (isLive) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addEntry', ...entry })
      }).catch(e => console.error("Error sending to sheet", e));
    } else {
        MOCK_ENTRIES.push(newEntry as Entry);
    }
    return newEntry;
  },

  updateEntry: async (entry: Entry) => {
    DATA_CACHE.entries = null;
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateEntry', ...entry })
      });
    } else {
        const idx = MOCK_ENTRIES.findIndex(e => e.id === entry.id);
        if (idx !== -1) MOCK_ENTRIES[idx] = entry;
    }
    return true;
  },

  getEntries: async (forceRefresh = false) => {
    let allEntries: Entry[] = [];
    const now = Date.now();
    if (!forceRefresh && DATA_CACHE.entries && (now - (DATA_CACHE.lastFetch['entries'] || 0) < CACHE_DURATION)) {
        allEntries = DATA_CACHE.entries;
    } else {
        if (isLive) {
           try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEntries`);
            const data = await response.json();
            if (Array.isArray(data)) {
                allEntries = data;
                DATA_CACHE.entries = data;
                DATA_CACHE.lastFetch['entries'] = now;
            }
           } catch (e) {
             allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES];
           }
        } else {
            allEntries = [...MOCK_ENTRIES];
        }
    }
    const serverIds = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverIds.has(e.id));
    return [...uniqueLocal, ...allEntries];
  },

  updateEntryStatus: async (id: string, status: string) => {
    const localEntry = LOCAL_NEW_ENTRIES.find(e => e.id === id);
    if(localEntry) localEntry.workStatus = status as any;
    if(DATA_CACHE.entries) {
        const cacheEntry = DATA_CACHE.entries.find(e => e.id === id);
        if(cacheEntry) cacheEntry.workStatus = status as any;
    }
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateEntryStatus', id, status })
        }).catch(e => console.error("BG Update Fail", e));
    }
    return true;
  },
  
  updatePaymentFollowUp: async (payload: any) => {
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'updatePaymentFollowUp', ...payload })
              });
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
    } else {
        if (isLive) {
           try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAppointments`);
            const data = await response.json();
            if (Array.isArray(data)) {
                allAppts = data;
                DATA_CACHE.appointments = data;
                DATA_CACHE.lastFetch['appointments'] = now;
            }
           } catch (e) {
             allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS];
           }
        } else {
             allAppts = [...MOCK_APPOINTMENTS];
        }
    }
    const serverIds = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverIds.has(a.id));
    return [...uniqueLocal, ...allAppts];
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const newAppt = { ...appt, id: 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5) };
    LOCAL_NEW_APPOINTMENTS.push(newAppt as Appointment);
    DATA_CACHE.appointments = null; 

    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addAppointment', ...appt })
        }).catch(e => {
            console.error("BG Appt Error", e);
        });
    } else {
        MOCK_APPOINTMENTS.push(newAppt as Appointment);
    }
    return newAppt;
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    DATA_CACHE.appointments = null; 
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateAppointmentStatus', id, status })
        }).catch(e => console.error("BG Appt Update Error", e));
    } else {
        const appt = MOCK_APPOINTMENTS.find(a => a.id === id);
        if (appt) appt.status = status;
    }
    return { id, status };
  },

  getPackages: async (forceRefresh = false) => {
      const now = Date.now();
      if (!forceRefresh && DATA_CACHE.packages && (now - (DATA_CACHE.lastFetch['packages'] || 0) < CACHE_DURATION)) {
          return DATA_CACHE.packages;
      }
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
      if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPackage', ...pkg, status: 'PENDING' })
        });
        return true; 
      }
      const newPkg = { ...pkg, id: 'pkg_' + MOCK_PACKAGES.length, status: 'PENDING' };
      MOCK_PACKAGES.push(newPkg as ServicePackage);
      return newPkg;
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null;
      if (isLive) { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updatePackageStatus', id, status }) }); }
      return true;
  },
  
  deletePackage: async (id: string) => {
      DATA_CACHE.packages = null;
      if (isLive) { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deletePackage', id }) }); }
      return true;
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null;
      if (isLive) { await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editPackage', ...pkg }) }); }
      return true;
  },

  checkClientPackage: async (clientName: string) => {
      if (!clientName) return null;
      const normalizedName = clientName.trim().toLowerCase();
      const packages = await api.getPackages();
      const pkg = packages.find((p: any) => p.clientName.trim().toLowerCase() === normalizedName && (p.status === 'ACTIVE' || p.status === 'APPROVED'));
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
      if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addUser', ...user, permissions: user.permissions ? user.permissions.join(',') : '' }) });
             return true;
          } catch (e) { return false; }
      }
      return true; 
  },

  updateUser: async (user: any) => {
      if (isLive) {
          try {
              await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ 
                      action: 'updateUser', 
                      ...user, 
                      permissions: Array.isArray(user.permissions) ? user.permissions.join(',') : user.permissions 
                  })
              });
              return true;
          } catch (e) { return false; }
      }
      return true;
  },
  
  updateUserProfile: async (payload: any) => {
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'updateUserProfile', ...payload })
              });
              return await res.json();
          } catch (e) { return false; }
      }
      return true;
  },
  
  deleteUser: async (username: string) => {
       if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteUser', username }) });
             return true;
          } catch (e) { return false; }
      }
      return true; 
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const entries = await api.getEntries();
    const totalClients = new Set(entries.map((e: any) => e.clientName)).size;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const totalOutstanding = entries.reduce((sum: number, e: any) => sum + (e.paymentMethod === 'PENDING' ? Number(e.amount || 0) : Number(e.pendingAmount || 0)), 0);
    return { totalClients, totalAmount, newClientsToday, serviceCount: entries.length, totalOutstanding };
  }
};
