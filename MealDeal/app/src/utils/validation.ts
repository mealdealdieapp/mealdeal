/**
 * Input Validation Module for MealDeal
 *
 * Provides comprehensive, schema-based input validation with NO external dependencies.
 * Follows OWASP input validation best practices:
 * - Whitelist allowed inputs
 * - Validate data type, length, format, range
 * - Reject unexpected fields
 * - Sanitize before use
 *
 * All validators return { valid: boolean; error?: string }
 * All sanitizers return sanitized string
 */

/**
 * Validation result type
 * Deutsch: Validierungsergebnis
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * German postal code (PLZ): exactly 5 digits
 * Deutsch: Deutsche Postleitzahl - genau 5 Ziffern
 */
function validatePLZ(plz: unknown): ValidationResult {
  if (typeof plz !== 'string') {
    return { valid: false, error: 'PLZ must be a string (PLZ muss ein String sein)' };
  }
  const trimmed = plz.trim();
  if (!/^\d{5}$/.test(trimmed)) {
    return { valid: false, error: 'PLZ must be exactly 5 digits (PLZ muss genau 5 Ziffern sein)' };
  }
  return { valid: true };
}

/**
 * Email validation using simple regex pattern
 * Deutsch: E-Mail-Validierung mit einfachem Regex-Muster
 * Whitelist format: localpart@domain.tld
 */
function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string (E-Mail muss ein String sein)' };
  }
  const trimmed = email.trim().toLowerCase();
  // Simple but effective email regex per OWASP
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return { valid: false, error: 'Invalid email format (Ungültiges E-Mail-Format)' };
  }
  return { valid: true };
}

/**
 * String length validation
 * Deutsch: String-Längenvaldierung
 * Prevents buffer overflow and excessive data
 */
function validateStringLength(value: unknown, minLength: number = 1, maxLength: number = 1000): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Must be a string (Muss ein String sein)' };
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `Minimum length is ${minLength} characters (Mindestlänge: ${minLength} Zeichen)` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Maximum length is ${maxLength} characters (Maximallänge: ${maxLength} Zeichen)` };
  }
  return { valid: true };
}

/**
 * Number range validation
 * Deutsch: Zahlenbereich-Validierung
 * Whitelist range: min <= value <= max
 */
function validateNumberRange(value: unknown, min: number, max: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: 'Must be a valid number (Muss eine gültige Zahl sein)' };
  }
  if (value < min || value > max) {
    return { valid: false, error: `Must be between ${min} and ${max} (Muss zwischen ${min} und ${max} liegen)` };
  }
  return { valid: true };
}

/**
 * Array length validation
 * Deutsch: Array-Längenvaldierung
 * Prevents DOS via excessive arrays
 */
function validateArrayLength(value: unknown, maxLength: number = 100): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Must be an array (Muss ein Array sein)' };
  }
  if (value.length > maxLength) {
    return { valid: false, error: `Maximum array length is ${maxLength} (Maximale Array-Länge: ${maxLength})` };
  }
  return { valid: true };
}

/**
 * User profile field validation
 * Deutsch: Benutzerprofilfeld-Validierung
 * Validates: firstName, lastName, email, zipCode
 */
function validateUserProfile(profile: unknown): ValidationResult {
  if (typeof profile !== 'object' || profile === null) {
    return { valid: false, error: 'Profile must be an object (Profil muss ein Objekt sein)' };
  }

  const obj = profile as Record<string, unknown>;

  // Check for unexpected fields (whitelist approach)
  const allowedFields = ['firstName', 'lastName', 'email', 'zipCode', 'id'];
  const unexpectedFields = Object.keys(obj).filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    return { valid: false, error: `Unexpected fields: ${unexpectedFields.join(', ')} (Unerwartete Felder)` };
  }

  // Validate firstName
  if ('firstName' in obj) {
    const fnResult = validateStringLength(obj.firstName, 1, 50);
    if (!fnResult.valid) {
      return { valid: false, error: `firstName: ${fnResult.error}` };
    }
  }

  // Validate lastName
  if ('lastName' in obj) {
    const lnResult = validateStringLength(obj.lastName, 1, 50);
    if (!lnResult.valid) {
      return { valid: false, error: `lastName: ${lnResult.error}` };
    }
  }

  // Validate email
  if ('email' in obj) {
    const emailResult = validateEmail(obj.email);
    if (!emailResult.valid) {
      return { valid: false, error: `email: ${emailResult.error}` };
    }
  }

  // Validate zipCode
  if ('zipCode' in obj) {
    const plzResult = validatePLZ(obj.zipCode);
    if (!plzResult.valid) {
      return { valid: false, error: `zipCode: ${plzResult.error}` };
    }
  }

  return { valid: true };
}

/**
 * Recipe search query validation
 * Deutsch: Rezeptsuchungsabfrage-Validierung
 * Whitelist: alphanumeric, spaces, common punctuation
 */
function validateRecipeSearchQuery(query: unknown): ValidationResult {
  const lengthResult = validateStringLength(query, 1, 100);
  if (!lengthResult.valid) {
    return lengthResult;
  }

  const trimmed = (query as string).trim();
  // Allow letters, numbers, spaces, hyphens, commas, parentheses
  if (!/^[a-zA-Z0-9äöüßÄÖÜ\s,\-()]*$/.test(trimmed)) {
    return { valid: false, error: 'Search query contains invalid characters (Suchanfrage enthält ungültige Zeichen)' };
  }

  return { valid: true };
}

/**
 * Shopping list item validation
 * Deutsch: Einkaufslistenelement-Validierung
 * Validates: name, quantity, unit
 */
function validateShoppingListItem(item: unknown): ValidationResult {
  if (typeof item !== 'object' || item === null) {
    return { valid: false, error: 'Item must be an object (Element muss ein Objekt sein)' };
  }

  const obj = item as Record<string, unknown>;

  // Whitelist allowed fields
  const allowedFields = ['name', 'quantity', 'unit', 'id', 'checked'];
  const unexpectedFields = Object.keys(obj).filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    return { valid: false, error: `Unexpected fields in item: ${unexpectedFields.join(', ')}` };
  }

  // Validate name
  if ('name' in obj) {
    const nameResult = validateStringLength(obj.name, 1, 100);
    if (!nameResult.valid) {
      return { valid: false, error: `name: ${nameResult.error}` };
    }
  }

  // Validate quantity (optional, if present must be positive number)
  if ('quantity' in obj && obj.quantity !== undefined) {
    const qtyResult = validateNumberRange(obj.quantity, 0, 1000);
    if (!qtyResult.valid) {
      return { valid: false, error: `quantity: ${qtyResult.error}` };
    }
  }

  // Validate unit (optional, whitelist common units)
  if ('unit' in obj && obj.unit !== undefined) {
    const validUnits = ['g', 'ml', 'l', 'kg', 'stk', 'pck', 'tasse', 'el', 'tl', ''];
    if (typeof obj.unit !== 'string' || !validUnits.includes(obj.unit.toLowerCase())) {
      return { valid: false, error: `unit: Invalid unit (Ungültige Einheit)` };
    }
  }

  return { valid: true };
}

/**
 * Offer filter validation
 * Deutsch: Angebots-Filter-Validierung
 * Validates: maxPrice, minDiscount, merchant, category
 */
function validateOfferFilter(filter: unknown): ValidationResult {
  if (typeof filter !== 'object' || filter === null) {
    return { valid: false, error: 'Filter must be an object (Filter muss ein Objekt sein)' };
  }

  const obj = filter as Record<string, unknown>;

  // Whitelist allowed fields
  const allowedFields = ['maxPrice', 'minDiscount', 'merchant', 'category'];
  const unexpectedFields = Object.keys(obj).filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    return { valid: false, error: `Unexpected filter fields: ${unexpectedFields.join(', ')}` };
  }

  // Validate maxPrice (optional, if present: 0 to 10000 EUR cents)
  if ('maxPrice' in obj && obj.maxPrice !== undefined) {
    const priceResult = validateNumberRange(obj.maxPrice, 0, 1000000);
    if (!priceResult.valid) {
      return { valid: false, error: `maxPrice: ${priceResult.error}` };
    }
  }

  // Validate minDiscount (optional, if present: 0-100%)
  if ('minDiscount' in obj && obj.minDiscount !== undefined) {
    const discountResult = validateNumberRange(obj.minDiscount, 0, 100);
    if (!discountResult.valid) {
      return { valid: false, error: `minDiscount: ${discountResult.error}` };
    }
  }

  // Validate merchant (optional, string max 50 chars)
  if ('merchant' in obj && obj.merchant !== undefined) {
    const merchantResult = validateStringLength(obj.merchant, 1, 50);
    if (!merchantResult.valid) {
      return { valid: false, error: `merchant: ${merchantResult.error}` };
    }
  }

  // Validate category (optional, string max 50 chars)
  if ('category' in obj && obj.category !== undefined) {
    const categoryResult = validateStringLength(obj.category, 1, 50);
    if (!categoryResult.valid) {
      return { valid: false, error: `category: ${categoryResult.error}` };
    }
  }

  return { valid: true };
}

/**
 * String sanitization
 * Deutsch: String-Bereinigung
 * - Trim whitespace
 * - Remove HTML/script tags
 * - Truncate to max length
 * - Lowercase (optional)
 */
function sanitizeString(value: unknown, maxLength: number = 1000, toLowerCase: boolean = false): string {
  if (typeof value !== 'string') {
    return '';
  }

  // Trim
  let sanitized = value.trim();

  // Remove HTML and script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Decode HTML entities like &lt; &gt; etc
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

  // Truncate
  sanitized = sanitized.substring(0, maxLength);

  // Optional lowercase
  if (toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  return sanitized;
}

/**
 * Sanitize email: trim, lowercase
 * Deutsch: E-Mail bereinigen
 */
function sanitizeEmail(email: unknown): string {
  return sanitizeString(email, 254, true);
}

/**
 * Sanitize PLZ: trim, keep only digits
 * Deutsch: PLZ bereinigen
 */
function sanitizePLZ(plz: unknown): string {
  if (typeof plz !== 'string') {
    return '';
  }
  return plz.trim().replace(/\D/g, '').substring(0, 5);
}

/**
 * Sanitize number: ensure it's within valid range
 * Deutsch: Zahl bereinigen
 */
function sanitizeNumber(value: unknown, min: number = 0, max: number = Infinity): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// EXPORTED VALIDATION OBJECT
// ============================================================================
/**
 * Validation methods
 * Deutsch: Validierungsmethoden
 * All return { valid: boolean; error?: string }
 */
export const validate = {
  plz: validatePLZ,
  email: validateEmail,
  stringLength: validateStringLength,
  numberRange: validateNumberRange,
  arrayLength: validateArrayLength,
  userProfile: validateUserProfile,
  recipeSearchQuery: validateRecipeSearchQuery,
  shoppingListItem: validateShoppingListItem,
  offerFilter: validateOfferFilter,
};

// ============================================================================
// EXPORTED SANITIZATION OBJECT
// ============================================================================
/**
 * Sanitization methods
 * Deutsch: Bereinigungsmethoden
 * All return sanitized string or number
 */
export const sanitize = {
  string: sanitizeString,
  email: sanitizeEmail,
  plz: sanitizePLZ,
  number: sanitizeNumber,
};

export type { ValidationResult };
