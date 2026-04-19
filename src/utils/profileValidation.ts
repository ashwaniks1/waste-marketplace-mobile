const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const t = email.trim();
  if (!t) return "Email is required";
  if (!EMAIL_RE.test(t)) return "Enter a valid email";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  const c = confirm.trim();
  if (!c) return "Confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return null;
}

export function validatePersonName(label: string, value: string): string | null {
  const t = value.trim();
  if (!t) return `${label} is required`;
  if (t.length > 60) return `${label} is too long`;
  if (!/^[\p{L}\s'.-]+$/u.test(t)) return `${label}: use letters, spaces, apostrophes, periods, or hyphens only`;
  if (!/\p{L}/u.test(t)) return `${label}: include at least one letter`;
  return null;
}

export function combinedDisplayName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.replace(/\s+/g, " ").trim();
}
