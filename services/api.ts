import { Entry, Client, Appointment, DashboardStats, ServicePackage, User } from '../types';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_APPOINTMENTS, MOCK_ITEMS, MOCK_TECHNICIANS, MOCK_PACKAGES, GOOGLE_SCRIPT_URL } from '../constants';

// Helper to check if we have a valid URL
const isLive = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http');

// Local cache to store entries added in the current session for immediate feedback
// This prevents the lag where Google Sheet hasn't updated yet but we need to calculate limits
const LOCAL_NEW_ENTRIES: Entry[] = [];

export const api = {
  getOptions: async () => {
    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOptions`);
        const data = await response.json();
        if (data && data.clients) {
            return {
                clients: data.clients,
                technicians: data.technicians || MOCK_TECHNICIANS,
                items: data.items || MOCK_ITEMS
            };
        }
      } catch (e) {
        console.warn("Failed to fetch from Google Sheet, falling back to mock data", e);
      }
    }
    // Fallback
    return {
      clients: MOCK_CLIENTS,
      technicians: MOCK_TECHNICIANS,
      items: MOCK_ITEMS
    };
  },

  getClientDetails: async (name: string) => {
    // In a real app, you might want to fetch this fresh, but filtering the list is faster for UX
    const options = await api.getOptions();
    return options.clients.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  },

  addEntry: async (entry: Omit<Entry, 'id'>) => {
    const newEntry = { ...entry, id: 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5) };
    
    // Add to local cache immediately
    LOCAL_NEW_ENTRIES.push(newEntry as Entry);

    if (isLive) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
          },
          body: JSON.stringify({
            action: 'addEntry',
            ...entry
          })
        });
      } catch (e) {
        console.error("Error sending to sheet", e);
        // We still keep it in local cache so UI doesn't break
      }
    } else {
        // Mock mode
        MOCK_ENTRIES.push(newEntry as Entry);
    }

    return newEntry;
  },

  getEntries: async () => {
    let allEntries: Entry[] = [];

    if (isLive) {
       try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEntries`);
        const data = await response.json();
        if (Array.isArray(data)) {
            allEntries = data;
        }
       } catch (e) {
         console.warn("Using mock entries due to fetch failure");
         allEntries = [...MOCK_ENTRIES];
       }
    } else {
        allEntries = [...MOCK_ENTRIES];
    }

    // Merge with local new entries (simple deduplication could be added if needed, 
    // but relying on the fact that sheet fetch might not have them yet)
    // We filter out any local entries that might have made it to the server list (unlikely with temp IDs but good practice)
    const serverIds = new Set(allEntries.map(e => e.id));
    const uniqueLocal = LOCAL_NEW_ENTRIES.filter(e => !serverIds.has(e.id));
    
    return [...uniqueLocal, ...allEntries];
  },

  addClient: async (client: Client) => {
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addClient', ...client })
        });
    }
    MOCK_CLIENTS.push(client);
    return client;
  },

  getAppointments: async () => {
    if (isLive) {
       try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAppointments`);
        const data = await response.json();
        if (Array.isArray(data)) return data;
       } catch (e) {
         // Fallback
       }
    }
    return [...MOCK_APPOINTMENTS];
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'addAppointment', ...appt })
        });
    }
    const newAppt = { ...appt, id: Math.random().toString(36).substr(2, 9) };
    MOCK_APPOINTMENTS.push(newAppt);
    return newAppt;
  },
  
  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    if (isLive) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateAppointmentStatus', id, status })
        });
    }
    const appt = MOCK_APPOINTMENTS.find(a => a.id === id);
    if (appt) appt.status = status;
    return appt;
  },

  // --- PACKAGE METHODS ---
  getPackages: async () => {
      if (isLive) {
          try {
              const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPackages`);
              const data = await response.json();
              if (Array.isArray(data)) return data;
          } catch (e) {
              console.warn("Failed to fetch packages", e);
          }
      }
      return [...MOCK_PACKAGES];
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
      if (isLive) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPackage', ...pkg })
            });
        } catch (error) {
            console.error("Error saving package to sheet:", error);
        }
      }
      const newPkg = { ...pkg, id: Math.random().toString(36).substr(2, 9) };
      MOCK_PACKAGES.push(newPkg);
      return newPkg;
  },

  checkClientPackage: async (clientName: string) => {
      if (!clientName) return null;
      const normalizedName = clientName.trim().toLowerCase();

      // 1. Fetch latest packages
      const packages = await api.getPackages();
      
      // 2. Find active package
      const pkg = packages.find((p: any) => p.clientName.trim().toLowerCase() === normalizedName && p.status === 'ACTIVE');
      
      if (!pkg) return null;

      // 3. Count entries for this client since package start date
      // We use getEntries() which now includes LOCAL_NEW_ENTRIES
      const entries = await api.getEntries();
      
      const pkgStartDate = new Date(pkg.startDate);
      // Reset time to start of day to ensure comparisons work for same-day entries
      pkgStartDate.setHours(0,0,0,0);

      const usedCount = entries.filter((e: any) => {
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          return (
             e.clientName.trim().toLowerCase() === normalizedName && 
             entryDate >= pkgStartDate &&
             e.serviceType === 'SERVICE' // Only count standard services
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
              if (Array.isArray(data)) return data;
          } catch (e) {
              console.warn("Failed to fetch users", e);
          }
      }
      return [];
  },

  addUser: async (user: User & { password: string }) => {
      if (isLive) {
          try {
             await fetch(GOOGLE_SCRIPT_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'addUser', ...user })
             });
             return true;
          } catch (e) {
              console.error("Failed to add user", e);
              return false;
          }
      }
      return true; // Mock success
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
    const entries = await api.getEntries();
    
    const totalClients = new Set(entries.map((e: any) => e.clientName)).size;
    const totalAmount = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const newClientsToday = entries.filter((e: any) => e.date === today && e.serviceType === 'NEW').length;
    const serviceCount = entries.length;

    return {
      totalClients,
      totalAmount,
      newClientsToday,
      serviceCount
    };
  }
};
