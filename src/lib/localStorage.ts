import CryptoJS from "crypto-js";

const SECRET_KEY = "local-storage-v1"; // static, non-secret

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

    if (!decrypted) return null; // 👈 IMPORTANT

    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
};

export const setEncryptedItem = <T>(key: string, value: T): void => {
  try {
    const encryptedKey = CryptoJS.SHA256(key).toString();
    const encryptedValue = encrypt(value);
    localStorage.setItem(encryptedKey, encryptedValue);
  } catch (error) {
    console.error("Encrypted set error:", error);
  }
};

export const getEncryptedItem = <T>(
  key: string,
  defaultValue: T
): T => {
  try {
    const encryptedKey = CryptoJS.SHA256(key).toString();
    const item = localStorage.getItem(encryptedKey);

    if (!item) return defaultValue;

    const decrypted = decrypt<T>(item);

    if (decrypted === null) {
      // 🧹 clean corrupted data
      localStorage.removeItem(encryptedKey);
      return defaultValue;
    }

    return decrypted;
  } catch {
    return defaultValue;
  }
};

export const removeEncryptedItem = (key: string): void => {
  const encryptedKey = CryptoJS.SHA256(key).toString();
  localStorage.removeItem(encryptedKey);
};

export const clearEncryptedStorage = (): void => {
  localStorage.clear();
};
