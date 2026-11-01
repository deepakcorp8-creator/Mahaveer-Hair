import { User, Role } from '../types';
import { GOOGLE_SCRIPT_URL, API_SECRET } from '../constants';

// Default permissions for a standard user if none are specified in the database
const DEFAULT_USER_PERMISSIONS = [
    '/new-entry',
    '/daily-report',
    '/appointments',
    '/history',
    '/packages',
    '/clients',
    '/calling'
];

export const authService = {
    login: async (username: string, password: string): Promise<User | null> => {
        const inputUser = String(username || '').trim();
        const inputPass = String(password || '').trim();

        if (!inputUser || !inputPass) {
            return null;
        }

        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
            // 1. Primary: Try secure backend login action
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'login',
                        secret: API_SECRET,
                        username: inputUser,
                        password: inputPass
                    })
                });

                const data = await response.json();

                if (data && data.status === 'success' && data.user) {
                    const foundUser = data.user;
                    const roleStr = String(foundUser.role || foundUser.ROLE || '').toUpperCase();
                    const role = roleStr === 'ADMIN' ? Role.ADMIN : Role.USER;

                    // Parse permissions
                    let perms: string[] = [];
                    if (foundUser.permissions && typeof foundUser.permissions === 'string') {
                        if (String(foundUser.permissions).trim() !== '') {
                            perms = foundUser.permissions.split(',').map((p: string) => p.trim());
                        }
                    } else if (Array.isArray(foundUser.permissions)) {
                        perms = foundUser.permissions;
                    }

                    if (role === Role.USER && perms.length === 0) {
                        perms = DEFAULT_USER_PERMISSIONS;
                    }

                    return {
                        username: foundUser.username || foundUser.USER_NAME,
                        role: role,
                        department: foundUser.department || foundUser.DEPARTMENT,
                        permissions: perms,
                        dpUrl: foundUser.dpUrl,
                        gender: foundUser.gender,
                        dob: foundUser.dob,
                        address: foundUser.address
                    };
                }
            } catch (e) {
                console.warn("Secure backend login endpoint returned non-OK or not deployed yet, trying compatibility check...", e);
            }

            // 2. Compatibility Fallback: If Google Apps Script has not yet been re-deployed with 'login' action,
            // authenticate against the existing users sheet so login does NOT break!
            try {
                const sep = GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?';
                const response = await fetch(`${GOOGLE_SCRIPT_URL}${sep}action=getUsers&secret=${encodeURIComponent(API_SECRET)}`);
                const data = await response.json();

                if (Array.isArray(data)) {
                    const found = data.find((u: any) => {
                        const dbUser = String(u.username || u.USER_NAME || '').toLowerCase();
                        const dbPass = String(u.password || u.USER_PASSWORD || '');
                        return dbUser === inputUser.toLowerCase() && dbPass === inputPass;
                    });

                    if (found) {
                        const roleStr = String(found.role || found.ROLE || '').toUpperCase();
                        const role = roleStr === 'ADMIN' ? Role.ADMIN : Role.USER;

                        let perms: string[] = [];
                        if (found.permissions && typeof found.permissions === 'string') {
                            if (String(found.permissions).trim() !== '') {
                                perms = found.permissions.split(',').map((p: string) => p.trim());
                            }
                        } else if (Array.isArray(found.permissions)) {
                            perms = found.permissions;
                        }

                        if (role === Role.USER && perms.length === 0) {
                            perms = DEFAULT_USER_PERMISSIONS;
                        }

                        return {
                            username: found.username || found.USER_NAME,
                            role: role,
                            department: found.department || found.DEPARTMENT || found.BRANCH,
                            permissions: perms,
                            dpUrl: found.dpUrl,
                            gender: found.gender,
                            dob: found.dob,
                            address: found.address
                        };
                    }
                }
            } catch (fallbackErr) {
                console.error("Compatibility login check failed:", fallbackErr);
            }
        }

        return null;
    }
};
