
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

// Increased Cache Duration for speed
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache for entries/appts
const OPTIONS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for clients/items

export const api = {
  // --- OPTION HELPERS (Clients, Technicians, Items) ---
  getOptions: async (forceRefresh = false) => {
    // Return cached if valid
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
            // Update Cache
            DATA_CACHE.options = result;
            DATA_CACHE.lastFetch['options'] = now;
            return result;
        }
      } catch (e) {
        console.warn("Failed to fetch options, using mock/cache", e);
      }
    }
    
    // Fallback or Initial Mock
    return {
      clients: MOCK_CLIENTS,
      technicians: MOCK_TECHNICIANS,
      items: MOCK_ITEMS
    };
  },

  getClientDetails: async (name: string) => {
    // Optimized: Use cache instead of fetching
    const options = await api.getOptions();
    return options.clients.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  },

  addClient: async (client: Client) => {
    // Invalidate Cache
    DATA_CACHE.options = null;
    
    if (isLive) {
        // Fire and forget - don't await
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
    
    // Add to local cache immediately
    LOCAL_NEW_ENTRIES.push(newEntry as Entry);
    
    if (isLive) {
      // OPTIMISTIC UI: Don't await the fetch. Let it run in background.
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify({
          action: 'addEntry',
          ...entry
        })
      }).catch(e => console.error("Error sending to sheet", e));
    } else {
        MOCK_ENTRIES.push(newEntry as Entry);
    }

    return newEntry;
  },

  getEntries: async (forceRefresh = false) => {
    let allEntries: Entry[] = [];
    const now = Date.now();

    // Check Cache
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
             console.warn("Using mock entries due to fetch failure");
             // If fetch fails, keep old cache if available
             allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES];
           }
        } else {
            allEntries = [...MOCK_ENTRIES];
        }
    }

    // Merge with local new entries
    const serverIds = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverIds.has(e.id));
    
    return [...uniqueLocal, ...allEntries];
  },

  updateEntry: async (entry: Entry) => {
      // Update Local Cache
      const localEntry = LOCAL_NEW_ENTRIES.find(e => e.id === entry.id);
      if(localEntry) Object.assign(localEntry, entry);

      if(DATA_CACHE.entries) {
          const cacheEntry = DATA_CACHE.entries.find(e => e.id === entry.id);
          if(cacheEntry) Object.assign(cacheEntry, entry);
      }

      // Update Mock
      const mockEntry = MOCK_ENTRIES.find(e => e.id === entry.id);
      if(mockEntry) Object.assign(mockEntry, entry);

      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'editEntry', ...entry })
          });
      }
      return true;
  },

  updateEntryStatus: async (id: string, status: string) => {
    // 1. Update Local Cache
    const localEntry = LOCAL_NEW_ENTRIES.find(e => e.id === id);
    if(localEntry) localEntry.workStatus = status as any;

    if(DATA_CACHE.entries) {
        const cacheEntry = DATA_CACHE.entries.find(e => e.id === id);
        if(cacheEntry) cacheEntry.workStatus = status as any;
    }

    // 2. Mock Data Update
    const mockEntry = MOCK_ENTRIES.find(e => e.id === id);
    if(mockEntry) mockEntry.workStatus = status as any;

    // 3. Live Update (Fire & Forget)
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateEntryStatus', id, status })
        }).catch(e => console.error("BG Update Fail", e));
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
             // Fallback
             allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS];
           }
        } else {
             allAppts = [...MOCK_APPOINTMENTS];
        }
    }

    // Merge Local Appointments
    const serverIds = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverIds.has(a.id));
    
    return [...uniqueLocal, ...allAppts];
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const newAppt = { ...appt, id: 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5) };
    
    // Add to local cache immediately so it shows in UI
    LOCAL_NEW_APPOINTMENTS.push(newAppt as Appointment);
    
    if (isLive) {
        // Fire & Forget
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
    // Update local caches immediately
    const localEntry = LOCAL_NEW_APPOINTMENTS.find(a => a.id === id);
    if(localEntry) localEntry.status = status;

    if(DATA_CACHE.appointments) {
        const cacheEntry = DATA_CACHE.appointments.find(a => a.id === id);
        if(cacheEntry) cacheEntry.status = status;
    }

    if (isLive) {
        // Fire & Forget
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

  // --- PACKAGE METHODS ---
  getPackages: async (forceRefresh = false) => {
      const now = Date.now();
      if (!forceRefresh && DATA_CACHE.packages && (now - (DATA_CACHE.lastFetch['packages'] || 0) < CACHE_DURATION)) {
          return DATA_CACHE.packages;
      }

      if (isLive) {
          try {
              // Add timestamp to bypass browser caching of GET requests
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPackages&t=${now}`);
              const data = await response.json();
              if (Array.isArray(data)) {
                  // Ensure status defaults to PENDING if coming back as undefined/empty string
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
      DATA_CACHE.packages = null; // Invalidate cache immediately
      
      const pkgPayload = { ...pkg, status: 'PENDING' }; // Always default to PENDING
      
      if (isLive) {
        // Critical: Do NOT return a fake object here.
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPackage', ...pkgPayload })
        });
        return true; 
      }
      
      // Mock mode only
      const newPkg = { ...pkgPayload, id: 'pkg_' + MOCK_PACKAGES.length };
      MOCK_PACKAGES.push(newPkg as ServicePackage);
      return newPkg;
  },

  updatePackageStatus: async (id: string, status: ServicePackage['status']) => {
      DATA_CACHE.packages = null; // Invalidate cache

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
      DATA_CACHE.packages = null; // Invalidate cache
      
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'deletePackage', id })
          });
      } else {
          const index = MOCK_PACKAGES.findIndex(p => p.id === id);
          if (index !== -1) {
              MOCK_PACKAGES.splice(index, 1);
          }
      }
      return true;
  },

  editPackage: async (pkg: ServicePackage) => {
      DATA_CACHE.packages = null; // Invalidate cache

      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'editPackage', ...pkg })
          });
      } else {
          const index = MOCK_PACKAGES.findIndex(p => p.id === pkg.id);
          if (index !== -1) {
              MOCK_PACKAGES[index] = { ...MOCK_PACKAGES[index], ...pkg };
          }
      }
      return true;
  },

  checkClientPackage: async (clientName: string, contact?: string) => {
      if (!clientName) return null;
      const normalizedName = clientName.trim().toLowerCase();

      // 1. Fetch latest packages (Use Cache!)
      const packages = await api.getPackages();
      
      // 2. Find active package
      const pkg = packages.find((p: any) => p.clientName.trim().toLowerCase() === normalizedName && p.status === 'ACTIVE');
      
      if (!pkg) return null;

      // 3. Count entries
      const entries = await api.getEntries();
      
      const pkgStartDate = new Date(pkg.startDate);
      pkgStartDate.setHours(0,0,0,0);

      const usedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          return (
             e.clientName.trim().toLowerCase() === normalizedName && 
             entryDate >= pkgStartDate &&
             (e.serviceType === 'SERVICE') && 
             (e.workStatus === 'DONE' || e.workStatus === 'PENDING_APPROVAL')
          );
      }).length;

      // 4. Return status
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

  // --- USER MANAGEMENT ---
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
      const payload = {
          ...user,
          permissions: user.permissions ? user.permissions.join(',') : ''
      };

      if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'addUser', ...payload })
             });
             return true;
          } catch (e) {
              console.error("Failed to add user", e);
              return false;
          }
      }
      return true; 
  },
  
  deleteUser: async (username: string) => {
       if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'deleteUser', username })
             });
             return true;
          } catch (e) {
              console.error("Failed to delete user", e);
              return false;
          }
      }
      return true; 
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    // 1. Fetch entries for revenue/service stats
    const entries = await api.getEntries();
    
    // 2. Fetch OPTIONS to get the ACTUAL CLIENT MASTER COUNT
    const options = await api.getOptions();
    
    // Use the length of the clients array from the Master Data
    const totalClients = options.clients ? options.clients.length : 0;
    
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const serviceCount = entries.length;

    return {
      totalClients, // Correct count from Client Master
      totalAmount,
      newClientsToday,
      serviceCount
    };
  }
};
