import { User, Role } from '../types';

// Simulating the "LOGIN" Google Sheet data
// In a real application, this data would be fetched from the Google Apps Script API
const SHEET_USERS = [
  { username: 'admin', password: 'admin', role: Role.ADMIN, department: 'Management' }, // Dev Admin
  { username: 'user', password: 'user', role: Role.USER, department: 'Sales' },        // Dev User
  { username: 'DEEPAK', password: 'DEEPAK123', role: Role.USER, department: 'MDO' }   // From User Screenshot
];

export const authService = {
  login: async (username: string, password: string): Promise<User | null> => {
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Find user in the "Sheet"
    // Note: In a real app, this logic happens on the backend (Google Apps Script)
    const foundUser = SHEET_USERS.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      // Return User object without password
      return {
        username: foundUser.username,
        role: foundUser.role,
        department: foundUser.department
      };
    }

    return null;
  }
};