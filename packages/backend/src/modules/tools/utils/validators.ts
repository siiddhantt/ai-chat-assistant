export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "A valid email address is required" };
  }
  return { valid: true };
}

export function validateDateFormat(date: string): ValidationResult {
  if (!date || !DATE_REGEX.test(date)) {
    return { valid: false, error: "Date must be in YYYY-MM-DD format" };
  }
  return { valid: true };
}

export function validateFutureDate(date: string): ValidationResult {
  const formatResult = validateDateFormat(date);
  if (!formatResult.valid) return formatResult;

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate < today) {
    return { valid: false, error: "Date cannot be in the past" };
  }
  return { valid: true };
}

export function validateTimeFormat(time: string): ValidationResult {
  if (!time || !TIME_24H_REGEX.test(time)) {
    return { valid: false, error: "Time must be in HH:MM format (24-hour)" };
  }
  return { valid: true };
}

export function validateBusinessHours(
  time: string,
  startHour = 9,
  endHour = 18
): ValidationResult {
  const formatResult = validateTimeFormat(time);
  if (!formatResult.valid) return formatResult;

  const [hours] = time.split(":").map(Number);
  if (hours < startHour || hours >= endHour) {
    return {
      valid: false,
      error: `Time must be between ${startHour}:00 and ${endHour}:00`,
    };
  }
  return { valid: true };
}

export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult {
  if (!value || value.trim().length < minLength) {
    return {
      valid: false,
      error: `${fieldName} is required and must be at least ${minLength} characters`,
    };
  }
  return { valid: true };
}

export function validateEnum<T extends string>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): ValidationResult {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid ${fieldName}. Must be one of: ${allowedValues.join(
        ", "
      )}`,
    };
  }
  return { valid: true };
}

export function combineValidations(
  ...validations: ValidationResult[]
): ValidationResult {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  return { valid: true };
}
