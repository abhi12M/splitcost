"use client";
import CryptoJS from "crypto-js";

/**
 * ⚠️ IMPORTANT:
 * Move this secret to .env in real projects
 * NEXT_PUBLIC_STORAGE_SECRET=my-secret-key
 */
const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_SECRET || "default-secret";
const isBrowser = typeof window !== "undefined";
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


export const setEncryptedItem = <T>(key: string, value: T): void => {
  if (!isBrowser) return; // Prevent server-side execution
  try {
    const encryptedKey = CryptoJS.SHA256(key).toString();
    const encryptedValue = encrypt(value);
    localStorage.setItem(encryptedKey, encryptedValue);
  } catch (error) {
    console.error("Encrypted set error:", error);
  }
};

export const getEncryptedItem = <T>(key: string, defaultValue: T): T => {
  if (!isBrowser) return defaultValue; // Return default on server
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
