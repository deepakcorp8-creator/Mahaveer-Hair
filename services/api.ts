
import { Entry, Client, Appointment, DashboardStats, ServicePackage, User, Role } from '../types';
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

// --- SECURITY & BRANCH HELPER ---
const getCurrentUserBranch = (): string | null => {
    try {
        const saved = localStorage.getItem('mahaveer_user');
        if (!saved) return null;
        const user: User = JSON.parse(saved);
        
        // Admin sees everything (return null to signify no filter)
        if (user.role === Role.ADMIN) return null;

        // Normalize Department to Branch Code
        const dept = (user.department || '').toUpperCase();
        if (dept.includes('JDP') || dept.includes('JAGDALPUR')) return 'JDP';
        if (dept.includes('RPR') || dept.includes('RAIPUR')) return 'RPR';
        
        // Default fallback if strictly defined, or return the raw dept
        return 'RPR'; 
    } catch (e) {
        return null;
    }
};

const toDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    // If already dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    // If yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }
    return dateStr;
};

const normalizeToISO = (dateStr: any): string => {
    if (!dateStr) return "";
    const str = String(dateStr).trim();
    
    // Already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    // Handle dd/mm/yyyy or d/m/yyyy
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Handle dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const parts = str.split('-');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return str;
};

export const api = {
  // --- OPTION HELPERS ---
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
                clients: data.clients.map((c: any) => ({ ...c, dob: normalizeToISO(c.dob) })),
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
    
    return {
      clients: MOCK_CLIENTS.map(c => ({ ...c, dob: normalizeToISO(c.dob) })),
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
    const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addClient', ...formattedClient })
        }).catch(err => console.error("BG Sync Error", err));
    } else {
        MOCK_CLIENTS.push(client);
    }
    return client;
  },

  updateClient: async (client: Client, originalName: string) => {
    DATA_CACHE.options = null;
    const formattedClient = { ...client, dob: toDDMMYYYY(client.dob) };
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'editClient', ...formattedClient, originalName })
      });
    }
    return true;
  },

  // --- ENTRIES ---
  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const formatted = { 
        ...entry, 
        date: toDDMMYYYY(entry.date),
        nextCallDate: entry.nextCallDate ? toDDMMYYYY(entry.nextCallDate) : ''
    };
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newEntry = { ...entry, id: tempId, date: normalizeToISO(entry.date) };
    
    LOCAL_NEW_ENTRIES.push(newEntry as Entry);
    
    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addEntry', ...formatted })
      });
      const result = await res.json();
      
      if (result.status === 'success' && result.id) {
          const localIndex = LOCAL_NEW_ENTRIES.findIndex(e => e.id === tempId);
          if (localIndex !== -1) {
              LOCAL_NEW_ENTRIES[localIndex].id = result.id;
              newEntry.id = result.id;
          }
      }
      return { ...newEntry, ...result };
    } else {
        MOCK_ENTRIES.push(newEntry as Entry);
    }
    return newEntry;
  },

  updateEntry: async (entry: Entry) => {
    DATA_CACHE.entries = null;
    const formatted = { 
        ...entry, 
        date: toDDMMYYYY(entry.date),
        nextCallDate: entry.nextCallDate ? toDDMMYYYY(entry.nextCallDate) : ''
    };
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
    const localIndex = LOCAL_NEW_ENTRIES.findIndex(e => e.id === id);
    if (localIndex !== -1) LOCAL_NEW_ENTRIES.splice(localIndex, 1);

    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteEntry', id: id })
      });
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
                allEntries = data.map((e: any) => ({ 
                    ...e, 
                    date: normalizeToISO(e.date),
                    nextCallDate: normalizeToISO(e.nextCallDate)
                }));
                DATA_CACHE.entries = allEntries;
                DATA_CACHE.lastFetch['entries'] = now;
            }
           } catch (e) {
             allEntries = (DATA_CACHE.entries || [...MOCK_ENTRIES]).map(e => ({ ...e, date: normalizeToISO(e.date) }));
           }
        } else {
            allEntries = MOCK_ENTRIES.map(e => ({ ...e, date: normalizeToISO(e.date) }));
        }
    }

    const serverIds = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverIds.has(e.id));
    let combinedEntries = [...uniqueLocal, ...allEntries];

    // --- SECURITY: BRANCH FILTER ---
    const userBranch = getCurrentUserBranch();
    if (userBranch) {
        combinedEntries = combinedEntries.filter(e => e.branch === userBranch);
    }

    return combinedEntries;
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
      const formatted = { 
          ...payload, 
          nextCallDate: toDDMMYYYY(payload.nextCallDate || '') 
      };
      if (isLive) {
          try {
              const res = await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'updatePaymentFollowUp', ...formatted })
              });
              const data = await res.json();
              
              if(DATA_CACHE.entries) {
                const entry = DATA_CACHE.entries.find(e => e.id === payload.id);
                if(entry) {
                    if(payload.paymentMethod) entry.paymentMethod = payload.paymentMethod as any;
                    if(payload.pendingAmount !== undefined) entry.pendingAmount = payload.pendingAmount;
                    if(payload.nextCallDate) entry.nextCallDate = normalizeToISO(payload.nextCallDate);
                    if(payload.remark) entry.remark = payload.remark;
                    if(data.screenshotUrl) entry.paymentScreenshotUrl = data.screenshotUrl;
                }
              }
              return data;
          } catch(e) { throw e; }
      }
      return { status: "success" };
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
                allAppts = data.map((a: any) => ({ ...a, date: normalizeToISO(a.date) }));
                DATA_CACHE.appointments = allAppts;
                DATA_CACHE.lastFetch['appointments'] = now;
            }
           } catch (e) {
             allAppts = (DATA_CACHE.appointments || [...MOCK_APPOINTMENTS]).map(a => ({ ...a, date: normalizeToISO(a.date) }));
           }
        } else {
             allAppts = MOCK_APPOINTMENTS.map(a => ({ ...a, date: normalizeToISO(a.date) }));
        }
    }

    const serverIds = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverIds.has(a.id));
    let combinedAppts = [...uniqueLocal, ...allAppts];

    const userBranch = getCurrentUserBranch();
    if (userBranch) {
        combinedAppts = combinedAppts.filter(a => a.branch === userBranch);
    }
    
    return combinedAppts;
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    const formatted = { ...appt, date: toDDMMYYYY(appt.date) };
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newAppt = { ...appt, id: tempId, date: normalizeToISO(appt.date) };
    
    LOCAL_NEW_APPOINTMENTS.push(newAppt as Appointment);
    
    if (isLive) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addAppointment', ...formatted })
        })
        .then(res => res.json())
        .then(result => {
             if (result.status === 'success' && result.id) {
                 const localIndex = LOCAL_NEW_APPOINTMENTS.findIndex(a => a.id === tempId);
                 if (localIndex !== -1) LOCAL_NEW_APPOINTMENTS[localIndex].id = result.id;
             }
        })
        .catch(e => console.error("BG Appt Error", e));
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
    } 
    return { id, status };
  },

  deleteAppointment: async (id: string) => {
    const localIndex = LOCAL_NEW_APPOINTMENTS.findIndex(a => a.id === id);
    if (localIndex !== -1) LOCAL_NEW_APPOINTMENTS.splice(localIndex, 1);
    
    if(DATA_CACHE.appointments) {
        const cacheIndex = DATA_CACHE.appointments.findIndex(a => a.id === id);
        if (cacheIndex !== -1) DATA_CACHE.appointments.splice(cacheIndex, 1);
    }

    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteAppointment', id })
      });
    }
    return true;
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
                      startDate: normalizeToISO(pkg.startDate),
                      status: pkg.status ? pkg.status : 'PENDING',
                      packageType: pkg.packageType || 'NEW',
                      oldServiceCount: Number(pkg.oldServiceCount || 0)
                  }));
                  
                  DATA_CACHE.packages = formattedData;
                  DATA_CACHE.lastFetch['packages'] = now;
                  return formattedData;
              }
          } catch (e) {
              console.warn("Failed to fetch packages", e);
          }
      }
      return MOCK_PACKAGES.map(p => ({ ...p, startDate: normalizeToISO(p.startDate) }));
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
      DATA_CACHE.packages = null; 
      const formatted = { ...pkg, startDate: toDDMMYYYY(pkg.startDate) };
      const pkgPayload = { ...formatted, status: 'PENDING' }; 
      
      if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPackage', ...pkgPayload })
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        return true; 
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
      if (isLive) {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'editPackage', ...formatted })
          });
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
      const pkgStartDate = new Date(pkg.startDate);
      pkgStartDate.setHours(0,0,0,0);

      const dbUsedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          return (
             e.clientName.trim().toLowerCase() === normalizedName && 
             entryDate >= pkgStartDate &&
             (e.serviceType === 'SERVICE') && 
             (e.workStatus === 'DONE' || e.workStatus === 'PENDING_APPROVAL')
          );
      }).length;

      const initialCount = pkg.packageType === 'OLD' ? (pkg.oldServiceCount || 0) : 0;
      const usedCount = dbUsedCount + initialCount;
      
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
                      dob: normalizeToISO(u.dob),
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
      const payload = { ...user, dob: toDDMMYYYY(user.dob || ''), permissions: user.permissions ? user.permissions.join(',') : '' };
      if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'addUser', ...payload })
             });
             return true;
          } catch (e) { return false; }
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
          } catch (e) { return false; }
      }
      return true; 
  },
  
  updateUser: async (payload: any) => {
    const formatted = { ...payload, dob: toDDMMYYYY(payload.dob || '') };
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', ...formatted, permissions: payload.permissions?.join(',') })
      });
    }
    return true;
  },

  updateUserProfile: async (payload: any) => {
    const formatted = { ...payload, dob: toDDMMYYYY(payload.dob || '') };
    if (isLive) {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateUserProfile', ...formatted }) });
        return await res.json();
    }
    return true;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const entries = await api.getEntries();
    const totalClients = new Set(entries.map((e: any) => e.clientName)).size;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const serviceCount = entries.length;

    const totalOutstanding = entries.reduce((sum: number, e: any) => {
        const due = e.paymentMethod === 'PENDING' ? Number(e.amount || 0) : Number(e.pendingAmount || 0);
        return sum + due;
    }, 0);

    return { totalClients, totalAmount, newClientsToday, serviceCount, totalOutstanding };
  }
};
