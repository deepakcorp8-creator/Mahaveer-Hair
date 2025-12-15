
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

// Helper to check if we have a valid URL
const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

// --- LOCAL CACHE & STATE MANAGEMENT ---
// 1. Temporary storage for items added in this session (shows up immediately)
const LOCAL_NEW_ENTRIES: Entry[] = [];
const LOCAL_NEW_APPOINTMENTS: Appointment[] = [];

// 2. Data Cache to prevent "Slow" performance (prevents fetching on every keystroke)
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

// Cache Duration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const OPTIONS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for options

export const api = {
  // --- OPTIONS (Clients, Techs, Items) ---
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
        console.warn("Failed to fetch options, using mock", e);
      }
    }
    
    // RESTORED FALLBACK: Return Mock Data
    return {
      clients: MOCK_CLIENTS,
      technicians: MOCK_TECHNICIANS,
      items: MOCK_ITEMS
    };
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

  // --- ENTRIES ---
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
             console.warn("Fetch failed, using mock entries");
             allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES];
           }
        } else {
            allEntries = [...MOCK_ENTRIES];
        }
    }

    // Merge Local Entries
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

    const mockEntry = MOCK_ENTRIES.find(e => e.id === id);
    if(mockEntry) mockEntry.workStatus = status as any;

    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateEntryStatus', id, status })
        }).catch(e => console.error("BG Update Fail", e));
    }
    return true;
  },
  
  updateEntry: async (entry: Entry) => {
      const localIdx = LOCAL_NEW_ENTRIES.findIndex(e => e.id === entry.id);
      if (localIdx !== -1) LOCAL_NEW_ENTRIES[localIdx] = entry;

      if(DATA_CACHE.entries) {
          const cacheIdx = DATA_CACHE.entries.findIndex(e => e.id === entry.id);
          if (cacheIdx !== -1) DATA_CACHE.entries[cacheIdx] = entry;
      }
      
      const mockIdx = MOCK_ENTRIES.findIndex(e => e.id === entry.id);
      if (mockIdx !== -1) MOCK_ENTRIES[mockIdx] = entry;

      if (isLive) {
         await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'editEntry', ...entry })
        });
      }
      return true;
  },

  // --- APPOINTMENTS ---
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
    
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addAppointment', ...appt })
        }).catch(e => console.error("BG Appt Error", e));
    } else {
        MOCK_APPOINTMENTS.push(newAppt as Appointment);
    }
    
    return newAppt;
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    const localEntry = LOCAL_NEW_APPOINTMENTS.find(a => a.id === id);
    if(localEntry) localEntry.status = status;

    if(DATA_CACHE.appointments) {
        const cacheEntry = DATA_CACHE.appointments.find(a => a.id === id);
        if(cacheEntry) cacheEntry.status = status;
    }

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

  // --- PACKAGES ---
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
                  const formattedData = data.map((pkg: any) => ({
                      ...pkg,
                      status: pkg.status ? pkg.status : 'PENDING'
                  }));
                  DATA_CACHE.packages = formattedData;
                  DATA_CACHE.lastFetch['packages'] = now;
                  return formattedData;
              }
          } catch (e) {
              console.warn("Failed to fetch packages", e);
          }
      }
      return [...MOCK_PACKAGES];
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
      DATA_CACHE.packages = null; 
      const pkgPayload = { ...pkg, status: 'PENDING' };
      
      if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPackage', ...pkgPayload })
        });
        return true; 
      } else {
        const newPkg = { ...pkgPayload, id: 'pkg_' + Date.now() };
        MOCK_PACKAGES.push(newPkg as ServicePackage);
        return true;
      }
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'updatePackageStatus', id, status })
          });
      } else {
          const pkg = MOCK_PACKAGES.find(p => p.id === id);
          if (pkg) pkg.status = status;
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
      } else {
           const idx = MOCK_PACKAGES.findIndex(p => p.id === id);
           if (idx !== -1) MOCK_PACKAGES.splice(idx, 1);
      }
      return true;
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null;
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'editPackage', ...pkg })
          });
      }
      return true;
  },

  checkClientPackage: async (clientName: string, contactNo?: string) => {
      if (!clientName && !contactNo) return null;
      const normalizedName = clientName ? clientName.trim().toLowerCase() : '';
      const normalizedContact = contactNo ? String(contactNo).trim() : '';

      const packages = await api.getPackages();
      
      const pkg = packages.find((p: any) => {
          const isActive = p.status === 'ACTIVE' || p.status === 'APPROVED';
          const nameMatch = p.clientName.trim().toLowerCase() === normalizedName;
          const contactMatch = normalizedContact && String(p.contact || '').trim() === normalizedContact;
          return isActive && (nameMatch || contactMatch);
      });
      
      if (!pkg) return null;

      const entries = await api.getEntries();
      const pkgStartDate = new Date(pkg.startDate);
      pkgStartDate.setHours(0,0,0,0);

      const usedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          const entryName = e.clientName.trim().toLowerCase();
          const entryContact = String(e.contactNo || '').trim();
          
          const isMatch = entryName === pkg.clientName.trim().toLowerCase() || 
                          (entryContact && entryContact === String(pkg.contact).trim());

          return (
             isMatch &&
             entryDate >= pkgStartDate &&
             (e.serviceType === 'SERVICE') && 
             (e.workStatus === 'DONE' || e.workStatus === 'PENDING_APPROVAL')
          );
      }).length;

      const currentServiceNumber = usedCount + 1;
      const isExpired = currentServiceNumber > pkg.totalServices;

      return {
          package: pkg,
          usedCount,
          currentServiceNumber,
          isExpired,
          remaining: Math.max(0, pkg.totalServices - usedCount)
      };
  },

  // --- USERS ---
  getUsers: async () => {
      if (isLive) {
          try {
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers`);
              const data = await response.json();
              if (Array.isArray(data)) {
                  return data.map((u: any) => ({
                      ...u,
                      permissions: u.permissions ? u.permissions.split(',') : []
                  }));
              }
          } catch (e) {
              console.warn("Failed to fetch users", e);
          }
      }
      return [];
  },

  addUser: async (user: User & { password: string }) => {
      if (isLive) {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'addUser', ...user, permissions: user.permissions?.join(',') })
             });
             return true;
      }
      return false; 
  },
  
  deleteUser: async (username: string) => {
       if (isLive) {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'deleteUser', username })
             });
             return true;
      }
      return false; 
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const entries = await api.getEntries();
    
    // Safety check in case entries are empty
    if (!entries || entries.length === 0) {
        return { totalClients: 0, totalAmount: 0, newClientsToday: 0, serviceCount: 0 };
    }
    
    const uniqueClients = new Set(entries.map((e: any) => e.clientName)).size;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;

    return {
      totalClients: uniqueClients,
      totalAmount,
      newClientsToday,
      serviceCount: entries.length
    };
  }
};
