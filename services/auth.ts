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

        // 1. Authenticate via secure backend login endpoint
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
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

                    // If Role is USER but no permissions defined, assign Defaults
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
                console.error("Login verification failed:", e);
            }
        }

        return null;
    }
};
