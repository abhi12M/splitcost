function getStorageDateFolder(rootFolder: string, timestamp: Date) {
  const year = timestamp.getUTCFullYear();
  const monthNumber = String(timestamp.getUTCMonth() + 1).padStart(2, "0");

  return `${rootFolder}/${year}/${monthNumber}`;
}

function createStorageToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** Keep the uploader's filename while making it safe for a storage object path. */
export function getStorageImageFileName(originalName: string) {
  const baseName = originalName.split(/[\\/]/).pop()?.trim() || "image";
  const stem = baseName.replace(/\.[^.]+$/, "").trim();
  const safeStem = stem
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*%]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 120)
    .trim();

  return `${safeStem || "image"}.webp`;
}

export function buildExpenseAttachmentPath(
  expenseId: string,
  timestamp = new Date(),
) {
  const folder = getStorageDateFolder("expenses", timestamp);

  return `${folder}/EXP-${expenseId}/ATT-${createStorageToken()}.jpg`;
}

export function buildBlogImagePath(
  blogId: string,
  originalName: string,
  timestamp = new Date(),
) {
  const folder = getStorageDateFolder("blogs", timestamp);

  return `${folder}/BLOG-${blogId}/${getStorageImageFileName(originalName)}`;
}

export function buildAdminMediaPath(originalName: string, timestamp = new Date()) {
  const folder = getStorageDateFolder("media", timestamp);

  return `${folder}/${getStorageImageFileName(originalName)}`;
}
