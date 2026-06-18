// Input validation utility helpers

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  return /^[6-9]\d{9}$/.test(cleaned) || /^\d{10,12}$/.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

export function isValidAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, "");
  return /^\d{12}$/.test(cleaned);
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>'";&]/g, "")
    .substring(0, 1000);
}

export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character (recommended)");
  return { valid: errors.length === 0, errors };
}
