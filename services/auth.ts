import { User, Role } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

// Default permissions for a standard user if none are specified in the database
const DEFAULT_USER_PERMISSIONS = [
    '/new-entry', 
    '/daily-report', 
    '/appointments', 
    '/history', 
    '/packages', 
    '/clients'
];

export const authService = {
  login: async (username: string, password: string): Promise<User | null> => {
    let users: any[] = [];
    
    // 1. Try to fetch from Google Sheet
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers`);
            const data = await response.json();
            if (Array.isArray(data)) {
                users = data;
            }
        } catch (e) {
            console.warn("Failed to fetch users from sheet, using fallback.");
        }
    }

    // 2. Fallback / Mock Data
    if (users.length === 0) {
        users = [
             { username: 'admin', password: 'admin', role: 'ADMIN', department: 'Management' },
             { username: 'DEEPAK', password: 'DEEPAK123', role: 'USER', department: 'MDO' },
        ];
    }

    // 3. Authenticate
    const foundUser = users.find((u: any) => {
        // Handle case insensitivity for username
        const dbUser = String(u.username || u.USER_NAME || '').toLowerCase();
        const inputUser = username.toLowerCase();
        
        // Handle password (convert to string)
        const dbPass = String(u.password || u.USER_PASSWORD || '');
        const inputPass = String(password);

        return dbUser === inputUser && dbPass === inputPass;
    });

    if (foundUser) {
        // Map sheet role string to Enum
        const roleStr = String(foundUser.role || foundUser.ROLE || '').toUpperCase();
        const role = roleStr === 'ADMIN' ? Role.ADMIN : Role.USER;

        // Parse permissions
        let perms: string[] = [];
        if (foundUser.permissions && typeof foundUser.permissions === 'string') {
            // Check if string is not empty before splitting
            if (foundUser.permissions.trim() !== '') {
                perms = foundUser.permissions.split(',');
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
            permissions: perms
        };
    }

    return null;
  }
};