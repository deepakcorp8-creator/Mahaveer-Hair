import { User, Role } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

export const authService = {
  login: async (username: string, password: string): Promise<User | null> => {
    let users: any[] = [];
    
    // 1. Try to fetch from Google Sheet
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
        try {
            // Assumes the Apps Script returns the LOGIN sheet data when action=getUsers or similar
            // If you haven't implemented 'getUsers' in Apps Script, you can use a general 'getData' with sheet name
            // For now, we assume standard GET request might return it or we use a specific action
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUsers`);
            const data = await response.json();
            if (Array.isArray(data)) {
                users = data;
            }
        } catch (e) {
            console.warn("Failed to fetch users from sheet, using fallback.");
        }
    }

    // 2. Fallback / Mock Data (Matches your screenshot + Dev defaults)
    if (users.length === 0) {
        users = [
             { username: 'admin', password: 'admin', role: 'ADMIN', department: 'Management' },
             { username: 'DEEPAK', password: 'DEEPAK123', role: 'USER', department: 'MDO' },
             { username: 'gulshan', password: '67890', role: 'admin', department: 'sales' } 
        ];
    }

    // 3. Authenticate
    const foundUser = users.find((u: any) => {
        // Handle case insensitivity for username
        const dbUser = String(u.username || u.USER_NAME || '').toLowerCase();
        const inputUser = username.toLowerCase();
        
        // Handle password (convert to string in case Sheet returns number like 67890)
        const dbPass = String(u.password || u.USER_PASSWORD || '');
        const inputPass = String(password);

        return dbUser === inputUser && dbPass === inputPass;
    });

    if (foundUser) {
        // Map sheet role string to Enum
        const roleStr = String(foundUser.role || foundUser.ROLE || '').toUpperCase();
        const role = roleStr === 'ADMIN' ? Role.ADMIN : Role.USER;

        return {
            username: foundUser.username || foundUser.USER_NAME,
            role: role,
            department: foundUser.department || foundUser.DEPARTMENT
        };
    }

    return null;
  }
};