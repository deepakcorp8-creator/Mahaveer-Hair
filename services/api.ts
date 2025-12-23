
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
    if (!forceRefresh && DATA_CACHE.options && (now - (DATA_CACHE.lastFetch['options'] || 0) < OPTIONS_CACHE_DURATION)) {
        return DATA_CACHE.options;
    }
    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOptions`);
        const data = await response.json();
        const result = { 
            clients: data.clients || MOCK_CLIENTS, 
            technicians: data.technicians || MOCK_TECHNICIANS, 
            items: data.items || MOCK_ITEMS 
        };
        DATA_CACHE.options = result;
        DATA_CACHE.lastFetch['options'] = now;
        return result;
      } catch (e) { console.warn(e); }
    }
    return { clients: MOCK_CLIENTS, technicians: MOCK_TECHNICIANS, items: MOCK_ITEMS };
  },

  addClient: async (client: Client) => {
    DATA_CACHE.options = null;
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addClient', ...client })
      });
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
      } catch (e) { console.warn(e); allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES]; }
    } else { allEntries = [...MOCK_ENTRIES]; }
    const serverCheck = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverCheck.has(e.id));
    return [...uniqueLocal, ...allEntries];
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    DATA_CACHE.entries = null;
    const formatted = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addEntry', ...formatted })
      });
      return await res.json();
    }
    return { ...entry, id: 'temp_' + Date.now() };
  },

  updateEntry: async (entry: Entry) => {
    DATA_CACHE.entries = null;
    const formatted = { ...entry, date: toDDMMYYYY(entry.date) };
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateEntry', ...formatted })
      });
    }
    return true;
  },

  deleteEntry: async (id: string) => {
    DATA_CACHE.entries = null;
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteEntry', id: id })
      });
    }
    return true;
  },

  updatePaymentFollowUp: async (payload: any) => {
    DATA_CACHE.entries = null;
    const formatted = { ...payload, nextCallDate: toDDMMYYYY(payload.nextCallDate) };
    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updatePaymentFollowUp', ...formatted })
      });
      return await res.json();
    }
    return { status: "success" };
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
                // Ensure status defaults to PENDING if undefined
                // Ensure oldServiceCount defaults to 0 and packageType defaults to NEW
                const formatted = data.map((p: any) => ({ 
                    ...p, 
                    startDate: normalizeToISO(p.startDate),
                    status: p.status || 'PENDING',
                    packageType: p.packageType || 'NEW',
                    oldServiceCount: Number(p.oldServiceCount || 0)
                }));
                DATA_CACHE.packages = formatted;
                DATA_CACHE.lastFetch['packages'] = now;
                return formatted;
            }
        } catch (e) { console.warn(e); }
    }
    return [...MOCK_PACKAGES];
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
      DATA_CACHE.packages = null;
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'addPackage', ...formatted })
          });
      }
      return true;
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'updatePackageStatus', id, status })
          });
      }
      return true;
  },

  deletePackage: async (id: string) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'deletePackage', id })
          });
      }
      return true;
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null;
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      if (isLive) await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'editPackage', ...formatted }) });
      return true;
  },

  checkClientPackage: async (clientName: string) => {
      if (!clientName) return null;
      const packages = await api.getPackages();
      const normalizedName = clientName.trim().toLowerCase();
      const pkg = packages.find((p: any) => p.clientName.trim().toLowerCase() === normalizedName && (p.status === 'ACTIVE' || p.status === 'APPROVED'));
      if (!pkg) return null;
      
      const entries = await api.getEntries();
      
      const pkgStartDate = new Date(pkg.startDate);
      pkgStartDate.setHours(0,0,0,0);

      const dbUsedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          return (
             e.clientName.trim().toLowerCase() === normalizedName && 
             entryDate >= pkgStartDate &&
             e.serviceType === 'SERVICE' && 
             e.workStatus === 'DONE'
          );
      }).length;

      // Add old service count if package type is OLD
      const initialCount = pkg.packageType === 'OLD' ? (pkg.oldServiceCount || 0) : 0;
      const usedCount = dbUsedCount + initialCount;

      return { 
          package: pkg, 
          usedCount, 
          currentServiceNumber: usedCount + 1, 
          remaining: Math.max(0, pkg.totalServices - usedCount), 
          isExpired: (usedCount + 1) > pkg.totalServices 
      };
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
      } catch (e) { console.warn(e); allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS]; }
    } else { allAppts = [...MOCK_APPOINTMENTS]; }
    
    // Merge Local
    const serverCheck = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverCheck.has(a.id));
    return [...uniqueLocal, ...allAppts];
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
      DATA_CACHE.appointments = null;
      const formatted = { ...appt, date: toDDMMYYYY(appt.date) };
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addAppointment', ...formatted })
          });
      }
      return true;
  },

  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    DATA_CACHE.appointments = null;
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateAppointmentStatus', id, status })
        });
    }
    return true;
  },

  deleteAppointment: async (id: string) => {
    DATA_CACHE.appointments = null;
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteAppointment', id: id })
        });
    }
    return true;
  },

  getUsers: async () => {
    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers`);
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.map((u: any) => ({
            ...u,
            permissions: u.permissions && typeof u.permissions === 'string' ? u.permissions.split(',') : (Array.isArray(u.permissions) ? u.permissions : [])
          }));
        }
      } catch (e) { console.warn(e); }
    }
    return [];
  },

  addUser: async (user: User & { password?: string }) => {
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addUser', ...user, permissions: user.permissions?.join(',') })
      });
    }
    return true;
  },

  updateUser: async (payload: any) => {
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', ...payload, permissions: payload.permissions?.join(',') })
      });
    }
    return true;
  },

  deleteUser: async (username: string) => {
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteUser', username })
      });
    }
    return true;
  },

  updateUserProfile: async (payload: any) => {
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateUserProfile', ...payload }) });
        return await res.json();
    }
    return true;
  }
};
