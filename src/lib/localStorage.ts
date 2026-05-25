import CryptoJS from "crypto-js";

import { LOCAL_GROUPS_KEY, MY_GROUPS_UPDATED_EVENT } from "@/lib/constants";

const SECRET_KEY = "local-storage-v1"; // static, non-secret
const isProduction = process.env.NODE_ENV === "production";

console.log(
  `running in ${isProduction ? "production" : "development"} mode`
);

const getEncryptedKey = (key: string): string => CryptoJS.SHA256(key).toString();

const getPrimaryStorageKey = (key: string): string =>
  isProduction ? getEncryptedKey(key) : key;


export const migrateLocalStorageKey = (oldKey: string, newKey: string): void => {
  try {
    const oldStorageKey = getPrimaryStorageKey(oldKey);
    const newStorageKey = getPrimaryStorageKey(newKey);
    const oldValue = localStorage.getItem(oldStorageKey);
    const newValue = localStorage.getItem(newStorageKey);
    if (oldValue !== null && newValue === null) {
      localStorage.setItem(newStorageKey, oldValue);
      localStorage.removeItem(oldStorageKey);
    }
  } catch {
  }
};

const encrypt = (value: unknown): string => {
  return CryptoJS.AES.encrypt(
    JSON.stringify(value),
    SECRET_KEY
  ).toString();
};

const decrypt = <T>(cipherText: string): T | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) return null;

    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
};

const parsePlainValue = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setEncryptedItem = <T>(key: string, value: T): void => {
  try {
    const primaryKey = getPrimaryStorageKey(key);
    const storedValue = isProduction ? encrypt(value) : JSON.stringify(value);

    localStorage.setItem(primaryKey, storedValue);

    if (key === LOCAL_GROUPS_KEY && typeof window !== "undefined") {
      window.dispatchEvent(new Event(MY_GROUPS_UPDATED_EVENT));
    }
  } catch (error) {
    console.error("Encrypted set error:", error);
  }
};

export const getEncryptedItem = <T>(
  key: string,
  defaultValue: T
): T => {
  try {
    const primaryKey = getPrimaryStorageKey(key);
    const storedItem = localStorage.getItem(primaryKey);

    if (!storedItem) return defaultValue;

    const parsedValue = isProduction
      ? decrypt<T>(storedItem)
      : parsePlainValue<T>(storedItem);

    if (parsedValue === null) {
      localStorage.removeItem(primaryKey);
      return defaultValue;
    }

    return parsedValue;
  } catch {
    return defaultValue;
  }
};

export const removeEncryptedItem = (key: string): void => {
  localStorage.removeItem(getPrimaryStorageKey(key));
};

export const clearEncryptedStorage = (): void => {
  localStorage.clear();
};
