export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(
  newPassword: string,
  currentPassword?: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (typeof newPassword === "string") {
    if (!/[A-Z]/.test(newPassword)) {
      errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(newPassword)) {
      errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/[0-9]/.test(newPassword)) {
      errors.push("Password must contain at least one numeric digit.");
    }
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(newPassword)) {
      errors.push("Password must contain at least one special character.");
    }
    if (currentPassword !== undefined && newPassword === currentPassword) {
      errors.push("New password cannot be the same as current password.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
