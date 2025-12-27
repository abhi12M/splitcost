import CryptoJS from "crypto-js";

/**
 * ⚠️ IMPORTANT:
 * Move this secret to .env in real projects
 * VITE_STORAGE_SECRET=my-secret-key
 */
const SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET || "default-secret";

/**
 * Encrypt any value
 */
const encrypt = (value: unknown): string => {
  return CryptoJS.AES.encrypt(
    JSON.stringify(value),
    SECRET_KEY
  ).toString();
};

/**
 * Decrypt stored value
 */
const decrypt = <T>(cipherText: string): T => {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

/**
 * Set encrypted item
 */
export const setEncryptedItem = <T>(key: string, value: T): void => {
  try {
    const encryptedKey = CryptoJS.SHA256(key).toString();
    const encryptedValue = encrypt(value);
    localStorage.setItem(encryptedKey, encryptedValue);
  } catch (error) {
    console.error("Encrypted set error:", error);
  }
};

/**
 * Get encrypted item
 */
export const getEncryptedItem = <T>(
  key: string,
  defaultValue: T
): T => {
  try {
    const encryptedKey = CryptoJS.SHA256(key).toString();
    const item = localStorage.getItem(encryptedKey);
    return item ? decrypt<T>(item) : defaultValue;
  } catch (error) {
    console.error("Encrypted get error:", error);
    return defaultValue;
  }
};

/**
 * Remove encrypted item
 */
export const removeEncryptedItem = (key: string): void => {
  const encryptedKey = CryptoJS.SHA256(key).toString();
  localStorage.removeItem(encryptedKey);
};

/**
 * Clear all storage
 */
export const clearEncryptedStorage = (): void => {
  localStorage.clear();
};
