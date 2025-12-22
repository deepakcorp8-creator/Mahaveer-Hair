
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

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
      } catch (e) { console.warn("Fallback options", e); }
    }
    return { clients: MOCK_CLIENTS, technicians: MOCK_TECHNICIANS, items: MOCK_ITEMS };
  },

  getEntries: async (forceRefresh = false) => {
    let allEntries: Entry[] = [];
    const now = Date.now();
    if (!forceRefresh && DATA_CACHE.entries && (now - (DATA_CACHE.lastFetch['entries'] || 0) < CACHE_DURATION)) {
        allEntries = DATA_CACHE.entries;
    } else if (isLive) {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEntries&_t=${now}`);
            const data = await response.json();
            if (Array.isArray(data)) { 
                allEntries = data.map((e: any) => ({ ...e, date: normalizeToISO(e.date) }));
                DATA_CACHE.entries = allEntries; 
                DATA_CACHE.lastFetch['entries'] = now;
            }
        } catch (e) { allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES]; }
    } else { allEntries = [...MOCK_ENTRIES]; }
    return allEntries;
  },

  getPackages: async (forceRefresh = false) => {
      const now = Date.now();
      // Use random salt for force refresh to bypass any proxy/CDN caching
      if (!forceRefresh && DATA_CACHE.packages && (now - (DATA_CACHE.lastFetch['packages'] || 0) < CACHE_DURATION)) return DATA_CACHE.packages;
      if (isLive) {
          try {
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPackages&_nocache=${now}${Math.random()}`);
              const data = await response.json();
              if (Array.isArray(data)) {
                  const formattedData = data.map((pkg: any) => ({ 
                      ...pkg, 
                      startDate: normalizeToISO(pkg.startDate), 
                      status: (pkg.status || '').trim().toUpperCase() || 'PENDING',
                      oldServiceNumber: Number(pkg.oldServiceNumber || 0),
                      packageType: (pkg.packageType || 'NEW').trim().toUpperCase()
                  }));
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
      if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'addPackage', ...formatted, status: 'PENDING' }) 
        });
        return await res.json();
      }
      return true;
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'updatePackageStatus', id, status: status.toUpperCase() }) 
              });
              const result = await res.json();
              if (result.error) throw new Error(result.error);
              return result;
          } catch (e) { throw e; }
      }
      return { status: "success" };
  },
  
  deletePackage: async (id: string) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'deletePackage', id }) 
              });
              const result = await res.json();
              if (result.error) throw new Error(result.error);
              return result;
          } catch (e) { throw e; }
      }
      return { status: "success" };
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null;
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'editPackage', ...formatted }) 
        });
        return await res.json();
      }
      return true;
  },

  addClient: async (client: Client) => {
    DATA_CACHE.options = null;
    const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addClient', ...formattedClient }) });
        return await res.json();
    }
    return formattedClient;
  },

  updateClient: async (client: Client, originalName: string) => {
      DATA_CACHE.options = null;
      const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
      if (isLive) {
          const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editClient', originalName, ...formattedClient }) });
          return await res.json();
      }
      return { status: "success" };
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const entryWithFormattedDate = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addEntry', ...entryWithFormattedDate })
      });
      return await res.json();
    }
    return { ...entry, id: 'temp_' + Date.now() };
  },

  updateEntry: async (entry: Entry) => {
    const formatted = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editEntry', ...formatted }) });
        return await res.json();
    }
    return true;
  },

  deleteEntry: async (id: string) => {
      if (isLive) {
          const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteEntry', id }) });
          return await res.json();
      }
      return true;
  },

  updatePaymentFollowUp: async (payload: any) => {
      const formattedPayload = { ...payload, nextCallDate: toDDMMYYYY(payload.nextCallDate) };
      if (isLive) {
          const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updatePaymentFollowUp', ...formattedPayload }) });
          return await res.json();
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
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAppointments&_t=${now}`);
            const data = await response.json();
            if (Array.isArray(data)) { 
                allAppts = data.map((a: any) => ({ ...a, date: normalizeToISO(a.date) })); 
                DATA_CACHE.appointments = allAppts; 
                DATA_CACHE.lastFetch['appointments'] = now;
            }
        } catch (e) { allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS]; }
    } else { allAppts = [...MOCK_APPOINTMENTS]; }
    return allAppts;
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const formatted = { ...appt, date: toDDMMYYYY(appt.date) };
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addAppointment', ...formatted }) });
        return await res.json();
    }
    return { ...formatted, id: 'temp_' + Date.now() };
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateAppointmentStatus', id, status }) });
        return await res.json();
    }
    return true;
  },

  deleteAppointment: async (id: string) => {
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteAppointment', id }) });
        return await res.json();
    }
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
      const totalUsedCount = (pkg.oldServiceNumber || 0) + usedCount;
      return { 
          package: pkg, 
          usedCount: totalUsedCount, 
          currentServiceNumber: totalUsedCount + 1, 
          isExpired: totalUsedCount + 1 > pkg.totalServices, 
          remaining: Math.max(0, pkg.totalServices - totalUsedCount) 
      };
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
    const [entries, options] = await Promise.all([ api.getEntries(true), api.getOptions(true) ]);
    const totalClients = options.clients ? options.clients.length : 0;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const serviceCount = entries.length;
    const totalOutstanding = entries.reduce((sum: number, e: any) => sum + Number(e.pendingAmount || 0), 0);
    return { totalClients, totalAmount, newClientsToday, serviceCount, totalOutstanding };
  }
};
