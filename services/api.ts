
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

// --- PERSISTENT CACHE ---
// The in-memory cache above dies on every reload / PWA restart, so each cold open
// had to wait on Apps Script before painting anything. Mirroring it to localStorage
// lets the app paint from disk instantly and refresh in the background.
const LS_CACHE_KEY = 'mahaveer_cache_v1';
const STALE_AFTER = 60 * 1000;               // serve instantly, but refresh behind the scenes
const MAX_SERVE_STALE = 12 * 60 * 60 * 1000; // older than this: wait for live data instead

const hydrateCache = () => {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.lastFetch) {
      DATA_CACHE = {
        options: saved.options ?? null,
        packages: saved.packages ?? null,
        entries: saved.entries ?? null,
        appointments: saved.appointments ?? null,
        lastFetch: saved.lastFetch || {}
      };
    }
  } catch (e) {
    // Corrupt or full storage: just start cold.
  }
};

const persistCache = () => {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify({
      options: DATA_CACHE.options,
      packages: DATA_CACHE.packages,
      entries: DATA_CACHE.entries,
      appointments: DATA_CACHE.appointments,
      lastFetch: DATA_CACHE.lastFetch
    }));
  } catch (e) {
    // Quota exceeded — keep running on the in-memory cache.
  }
};

hydrateCache();

// Drop a cached sheet (in memory *and* on disk) so the next read goes to the server.
// Without clearing disk too, a reload right after adding an entry would rehydrate the
// stale copy and the new record would appear to have vanished.
const invalidate = (key: 'options' | 'entries' | 'appointments' | 'packages') => {
  DATA_CACHE[key] = null;
  delete DATA_CACHE.lastFetch[key];
  persistCache();
};

// --- REQUEST DE-DUPLICATION ---
// Dashboard, Daily Report and Pending Payments can mount together and each ask for
// the same sheet. Without this they fire identical requests that Apps Script runs
// one after another. Now they all wait on the same single request.
const inFlight: { [key: string]: Promise<any> } = {};

const fetchOnce = <T>(key: string, run: () => Promise<T>): Promise<T> => {
  if (inFlight[key]) return inFlight[key] as Promise<T>;
  const request = run().finally(() => { delete inFlight[key]; });
  inFlight[key] = request;
  return request;
};

// Fired whenever a background refresh brings in newer data than what is on screen.
// Screens listen via api.subscribe() and repaint themselves.
const DATA_UPDATED_EVENT = 'mahaveer:data-updated';

const notifyUpdated = (key: string) => {
  try {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: { key } }));
  } catch (e) {
    // Non-browser context: nothing to notify.
  }
};

// Only wake the UI when the sheet actually changed — a poll that finds nothing new
// must not cause a re-render.
const commit = <T>(key: 'options' | 'entries' | 'appointments' | 'packages', value: T) => {
  const changed = JSON.stringify(value) !== JSON.stringify(DATA_CACHE[key]);
  (DATA_CACHE as any)[key] = value;
  DATA_CACHE.lastFetch[key] = Date.now();
  persistCache();
  if (changed) notifyUpdated(key);
  return value;
};

const cacheAge = (key: string) => Date.now() - (DATA_CACHE.lastFetch[key] || 0);

// Cached value is good enough to paint right now (anything older is discarded
// so nobody is shown yesterday's numbers).
const canServeFromCache = (key: string, value: any) => !!value && cacheAge(key) < MAX_SERVE_STALE;

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
  // --- OPTION HELPERS ---
  getOptions: async (forceRefresh = false) => {
    const fetchOptions = () => fetchOnce('options', async () => {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOptions`);
      const data = await response.json();
      if (data && data.clients) {
        return commit('options', {
          clients: data.clients,
          technicians: data.technicians || MOCK_TECHNICIANS,
          items: data.items || MOCK_ITEMS
        });
      }
      throw new Error('Malformed options response');
    });

    if (isLive) {
      if (!forceRefresh && canServeFromCache('options', DATA_CACHE.options)) {
        if (cacheAge('options') > OPTIONS_CACHE_DURATION) fetchOptions().catch(() => { });
        return DATA_CACHE.options;
      }

      try {
        return await fetchOptions();
      } catch (e) {
        console.warn("Failed to fetch options", e);
        if (DATA_CACHE.options) return DATA_CACHE.options;
      }
    }

    return {
      clients: MOCK_CLIENTS,
      technicians: MOCK_TECHNICIANS,
      items: MOCK_ITEMS
    };
  },

  getClientDetails: async (name: string) => {
    const options = await api.getOptions();
    return options.clients.find((c: any) => String(c.name || '').toLowerCase() === String(name || '').toLowerCase());
  },

  addClient: async (client: Client) => {
    invalidate('options');
    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addClient', ...client })
      });
      return await res.json();
    } else {
      MOCK_CLIENTS.push(client);
    }
    return client;
  },

  updateClient: async (client: Client, originalName: string) => {
    invalidate('options');
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'editClient', ...client, originalName })
      });
    }
    return true;
  },

  // --- ENTRIES (WITH BRANCH FILTER) ---
  addEntry: async (entry: Omit<Entry, 'id'>) => {
    // Send Date directly (YYYY-MM-DD) to Backend
    const formatted = { ...entry };
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newEntry = { ...entry, id: tempId };

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
    invalidate('entries');
    // Send Date directly (YYYY-MM-DD)
    const formatted = { ...entry };
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
    invalidate('entries');
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

    const fetchEntries = () => fetchOnce('entries', async () => {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEntries`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const mapped: Entry[] = data.map((e: any) => ({ ...e, date: normalizeToISO(e.date) }));
        return commit('entries', mapped);
      }
      return DATA_CACHE.entries || [];
    });

    if (!isLive) {
      allEntries = [...MOCK_ENTRIES];
    } else if (!forceRefresh && canServeFromCache('entries', DATA_CACHE.entries)) {
      // Paint from cache immediately; quietly pull fresh data if it is going stale.
      allEntries = DATA_CACHE.entries!;
      if (cacheAge('entries') > STALE_AFTER) fetchEntries().catch(() => { });
    } else {
      try {
        allEntries = await fetchEntries();
      } catch (e) {
        allEntries = DATA_CACHE.entries || [...MOCK_ENTRIES];
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
    if (localEntry) localEntry.workStatus = status as any;

    if (DATA_CACHE.entries) {
      const cacheEntry = DATA_CACHE.entries.find(e => e.id === id);
      if (cacheEntry) cacheEntry.workStatus = status as any;
    }

    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateEntryStatus', id, status })
      });
    }
    return true;
  },

  updatePaymentFollowUp: async (payload: any) => {
    // Send Date directly
    const formatted = { ...payload };
    if (isLive) {
      try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updatePaymentFollowUp', ...formatted })
        });
        const data = await res.json();

        if (DATA_CACHE.entries) {
          const entry = DATA_CACHE.entries.find(e => e.id === payload.id);
          if (entry) {
            if (payload.paymentMethod) entry.paymentMethod = payload.paymentMethod as any;
            if (payload.pendingAmount !== undefined) entry.pendingAmount = payload.pendingAmount;
            if (payload.nextCallDate) entry.nextCallDate = payload.nextCallDate;
            if (payload.remark) entry.remark = payload.remark;
            if (data.screenshotUrl) entry.paymentScreenshotUrl = data.screenshotUrl;
          }
        }
        return data;
      } catch (e) { throw e; }
    }
    return { status: "success" };
  },

  getPaymentHistory: async (forceRefresh = false) => {
    // Basic cache logic
    if (isLive) {
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPaymentHistory`);
        const data = await response.json();

        // DETECT BACKEND ERROR (e.g. Action not found)
        if (data.error) throw new Error(data.error);

        // Filter for Paid Amount > 0 as per requirement
        if (Array.isArray(data)) {
          return data.filter((p: any) => Number(p.paidAmount) > 0).map((p: any) => ({
            ...p,
            date: normalizeToISO(p.date)
          }));
        }
      } catch (e) {
        console.warn("Failed to fetch payment history", e);
        throw e; // Propagate error to UI
      }
    }
    return [];
  },

  // --- APPOINTMENTS (WITH BRANCH FILTER) ---
  getAppointments: async (forceRefresh = false) => {
    let allAppts: Appointment[] = [];

    const fetchAppts = () => fetchOnce('appointments', async () => {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAppointments`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const mapped: Appointment[] = data.map((a: any) => ({ ...a, date: normalizeToISO(a.date) }));
        return commit('appointments', mapped);
      }
      return DATA_CACHE.appointments || [];
    });

    if (!isLive) {
      allAppts = [...MOCK_APPOINTMENTS];
    } else if (!forceRefresh && canServeFromCache('appointments', DATA_CACHE.appointments)) {
      allAppts = DATA_CACHE.appointments!;
      if (cacheAge('appointments') > STALE_AFTER) fetchAppts().catch(() => { });
    } else {
      try {
        allAppts = await fetchAppts();
      } catch (e) {
        allAppts = DATA_CACHE.appointments || [...MOCK_APPOINTMENTS];
      }
    }

    const serverIds = new Set(allAppts.map(a => a.id));
    const uniqueLocal = LOCAL_NEW_APPOINTMENTS.filter(a => !serverIds.has(a.id));
    let combinedAppts = [...uniqueLocal, ...allAppts];

    // --- SECURITY: BRANCH FILTER ---
    const userBranch = getCurrentUserBranch();
    if (userBranch) {
      combinedAppts = combinedAppts.filter(a => a.branch === userBranch);
    }

    return combinedAppts;
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>) => {
    // Send Date directly
    const formatted = { ...appt };
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newAppt = { ...appt, id: tempId };

    LOCAL_NEW_APPOINTMENTS.push(newAppt as Appointment);

    if (isLive) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addAppointment', ...formatted })
      });
      const result = await res.json();
      if (result.status === 'success' && result.id) {
        const localIndex = LOCAL_NEW_APPOINTMENTS.findIndex(a => a.id === tempId);
        if (localIndex !== -1) LOCAL_NEW_APPOINTMENTS[localIndex].id = result.id;
      }
      return { ...newAppt, ...result };
    } else {
      MOCK_APPOINTMENTS.push(newAppt as Appointment);
    }
    return newAppt;
  },

  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    const localEntry = LOCAL_NEW_APPOINTMENTS.find(a => a.id === id);
    if (localEntry) localEntry.status = status;

    if (DATA_CACHE.appointments) {
      const cacheEntry = DATA_CACHE.appointments.find(a => a.id === id);
      if (cacheEntry) cacheEntry.status = status;
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

    if (DATA_CACHE.appointments) {
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
    return [...MOCK_PACKAGES];
  },

  addPackage: async (pkg: Omit<ServicePackage, 'id'>) => {
    invalidate('packages');
    // Send Date directly
    const formatted = { ...pkg };
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
    invalidate('packages');
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
    invalidate('packages');
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
    invalidate('packages');
    // Send Date directly
    const formatted = { ...pkg };
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
    const normalizedName = String(clientName || '').trim().toLowerCase();
    const packages = await api.getPackages();
    const pkg = packages.find((p: any) => String(p.clientName || '').trim().toLowerCase() === normalizedName && (p.status === 'ACTIVE' || p.status === 'APPROVED'));
    if (!pkg) return null;

    const entries = await api.getEntries();
    const pkgStartDate = new Date(pkg.startDate);
    pkgStartDate.setHours(0, 0, 0, 0);

    const dbUsedCount = entries.filter((e: any) => {
      const entryDate = new Date(e.date);
      entryDate.setHours(0, 0, 0, 0);
      return (
        String(e.clientName || '').trim().toLowerCase() === normalizedName &&
        entryDate >= pkgStartDate &&
        (e.serviceType === 'SERVICE') &&
        (e.workStatus === 'DONE' || e.workStatus === 'PENDING_APPROVAL') &&
        (!e.remark || !String(e.remark || '').toLowerCase().includes('service not count'))
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
    const payload = { ...user, permissions: user.permissions ? user.permissions.join(',') : '' };
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
    if (isLive) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', ...payload, permissions: payload.permissions?.join(',') })
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
  },

  // Screens call this to repaint themselves the moment fresher data lands.
  // Returns an unsubscribe function for useEffect cleanup.
  subscribe: (onUpdate: (key: string) => void) => {
    const handler = (e: Event) => onUpdate((e as CustomEvent).detail?.key);
    window.addEventListener(DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, handler);
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    // This calls getEntries, which is now filtered by Branch
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

// --- LIVE DATA ENGINE ---
// Warm start: pull the sheets every screen needs the moment the app boots, rather than
// waiting for a component to mount and ask.
// Then keep them live: re-check on a timer, and immediately whenever the user comes back
// to the app (tab focus, phone unlock, network restored). Anything that actually changed
// fires 'mahaveer:data-updated' and the open screen repaints itself — no manual refresh.
const LIVE_POLL_INTERVAL = 30 * 1000;

if (isLive && typeof window !== 'undefined') {
  const revalidate = () => {
    if (typeof document !== 'undefined' && document.hidden) return; // don't poll in the background
    api.getEntries(true).catch(() => { });
    api.getAppointments(true).catch(() => { });
  };

  setTimeout(() => {
    api.getEntries().catch(() => { });
    api.getOptions().catch(() => { });
  }, 0);

  setInterval(revalidate, LIVE_POLL_INTERVAL);
  window.addEventListener('focus', revalidate);
  window.addEventListener('online', revalidate);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revalidate();
  });
}
