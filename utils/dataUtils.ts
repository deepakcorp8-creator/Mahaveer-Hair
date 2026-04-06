/**
 * Safely extracts the first character of a string as an uppercase initial.
 * Handles null, undefined, numbers, and other non-string types.
 */
export const getInitial = (name: any): string => {
  if (!name) return '?';
  const nameStr = String(name).trim();
  if (nameStr.length === 0) return '?';
  return nameStr.charAt(0).toUpperCase();
};

/**
 * Validates a 10-digit Indian mobile number.
 */
export const isValidPhone = (phone: any): boolean => {
  if (!phone) return false;
  const phoneStr = String(phone).replace(/\D/g, ''); // Remove non-numeric
  return phoneStr.length === 10;
};

/**
 * Validates if a name is likely a real name (not just numbers or empty).
 */
export const isValidName = (name: any): boolean => {
  if (!name) return false;
  const nameStr = String(name).trim();
  if (nameStr.length < 2) return false;
  // Check if it's not JUST numbers
  if (/^\d+$/.test(nameStr)) return false;
  return true;
};
