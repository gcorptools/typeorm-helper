import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

/**
 * Some values considered as empty HTML values
 */
export const EMPTY = {
  string: '',
  html: '<p></p>'
};

/**
 * Check if given value is empty
 * @param value
 * @param html since HTML values are special string, check value against specific sets of strings
 * @returns
 */
export const isEmpty = (
  value: string | any[] | undefined,
  html: boolean = false
) => {
  if (!value) {
    // No need to go further
    return true;
  }
  if (Array.isArray(value)) {
    // For arrays
    return value.length === 0;
  }
  const safeValue = `${value}`.trim();
  const empty = safeValue.length === 0;
  return !html ? empty : _isEmptyHtml(safeValue);
};

/**
 * Hash a password into an unique string
 * @param password the password to hash
 */
export const toHash = async (password: string): Promise<string> => {
  const salt = randomBytes(8).toString(HEX);
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buffer.toString(HEX)}.${salt}`;
};

/**
 * Compare password with a hashed version
 * @param storedPassword the hash to use in comparison
 * @param password the tested password
 */
export const compareToHash = async (
  storedPassword: string,
  password: string
): Promise<boolean> => {
  const [hashedPassword, salt] = storedPassword.split('.');
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return hashedPassword === `${buffer.toString(HEX)}`;
};

/**
 * Capitalize first letter of each word
 * @param words
 */
export const capitalizeFirst = (words: string): string =>
  (words || EMPTY.string)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const _isEmptyHtml = (htmlString: string): boolean => {
  const empty = !htmlString || htmlString === null || htmlString === undefined;
  if (empty) {
    return true;
  }
  // Non empty with HTML, we must check if empty paragraphs
  const safeValue = `${htmlString}`.trim().toLowerCase();
  return ['<p></br></p>', '<p><br></p>', EMPTY.html].includes(safeValue);
};

const HEX = 'hex';
const scryptAsync = promisify(scrypt);
