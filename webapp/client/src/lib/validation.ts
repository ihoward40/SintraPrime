/**
 * Field Validation Utilities
 * Provides validation functions for tax-related data fields
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate EIN (Employer Identification Number)
 * Format: XX-XXXXXXX (2 digits, hyphen, 7 digits)
 */
export function validateEIN(ein: string): ValidationResult {
  if (!ein) {
    return { valid: false, error: "EIN is required" };
  }

  // Remove any whitespace
  const cleaned = ein.trim();

  // Check format: XX-XXXXXXX
  const einRegex = /^\d{2}-\d{7}$/;
  if (!einRegex.test(cleaned)) {
    return {
      valid: false,
      error: "EIN must be in format XX-XXXXXXX (e.g., 12-3456789)",
    };
  }

  // Extract the two-digit prefix
  const prefix = cleaned.substring(0, 2);
  const prefixNum = parseInt(prefix, 10);

  // Valid EIN prefixes: 01-06, 10-16, 20-27, 30-39, 40-48, 50-68, 71-77, 80-88, 90-95, 98-99
  const validPrefixes = [
    [1, 6], [10, 16], [20, 27], [30, 39], [40, 48],
    [50, 68], [71, 77], [80, 88], [90, 95], [98, 99]
  ];

  const isValidPrefix = validPrefixes.some(
    ([min, max]) => prefixNum >= min && prefixNum <= max
  );

  if (!isValidPrefix) {
    return {
      valid: false,
      error: "Invalid EIN prefix. Please verify the number.",
    };
  }

  return { valid: true };
}

/**
 * Validate SSN (Social Security Number)
 * Format: XXX-XX-XXXX (3 digits, hyphen, 2 digits, hyphen, 4 digits)
 */
export function validateSSN(ssn: string): ValidationResult {
  if (!ssn) {
    return { valid: false, error: "SSN is required" };
  }

  // Remove any whitespace
  const cleaned = ssn.trim();

  // Check format: XXX-XX-XXXX
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  if (!ssnRegex.test(cleaned)) {
    return {
      valid: false,
      error: "SSN must be in format XXX-XX-XXXX (e.g., 123-45-6789)",
    };
  }

  // Extract components
  const [area, group, serial] = cleaned.split("-");

  // Invalid area numbers: 000, 666, 900-999
  const areaNum = parseInt(area, 10);
  if (areaNum === 0 || areaNum === 666 || areaNum >= 900) {
    return {
      valid: false,
      error: "Invalid SSN area number. Please verify the number.",
    };
  }

  // Invalid group number: 00
  if (group === "00") {
    return {
      valid: false,
      error: "Invalid SSN group number. Please verify the number.",
    };
  }

  // Invalid serial number: 0000
  if (serial === "0000") {
    return {
      valid: false,
      error: "Invalid SSN serial number. Please verify the number.",
    };
  }

  return { valid: true };
}

/**
 * Validate dollar amount
 * Checks for reasonable range and format
 */
export function validateDollarAmount(
  amount: number | string,
  options: {
    min?: number;
    max?: number;
    allowNegative?: boolean;
    fieldName?: string;
  } = {}
): ValidationResult {
  const {
    min = 0,
    max = 999999999.99,
    allowNegative = false,
    fieldName = "Amount",
  } = options;

  // Convert to number if string
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Check if valid number
  if (isNaN(numAmount)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  // Check negative
  if (!allowNegative && numAmount < 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be negative`,
    };
  }

  // Check minimum
  if (numAmount < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least $${min.toFixed(2)}`,
    };
  }

  // Check maximum
  if (numAmount > max) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed $${max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  }

  // Check decimal places (max 2)
  const decimalPlaces = (numAmount.toString().split(".")[1] || "").length;
  if (decimalPlaces > 2) {
    return {
      valid: false,
      error: `${fieldName} can have at most 2 decimal places`,
    };
  }

  return { valid: true };
}

/**
 * Validate tax year
 * Checks for reasonable range (1900 to current year + 1)
 */
export function validateTaxYear(year: number | string): ValidationResult {
  const numYear = typeof year === "string" ? parseInt(year, 10) : year;

  if (isNaN(numYear)) {
    return {
      valid: false,
      error: "Tax year must be a valid number",
    };
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1900;
  const maxYear = currentYear + 1; // Allow next year for planning

  if (numYear < minYear || numYear > maxYear) {
    return {
      valid: false,
      error: `Tax year must be between ${minYear} and ${maxYear}`,
    };
  }

  return { valid: true };
}

/**
 * Format EIN for display
 * Adds hyphen if missing
 */
export function formatEIN(ein: string): string {
  const cleaned = ein.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
  }
  return ein;
}

/**
 * Format SSN for display
 * Adds hyphens if missing
 */
export function formatSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5)}`;
  }
  return ssn;
}

/**
 * Format dollar amount for display
 */
export function formatDollarAmount(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return "$0.00";
  }
  return `$${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse dollar amount from string (removes $, commas)
 */
export function parseDollarAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[$,]/g, "");
  return parseFloat(cleaned) || 0;
}
