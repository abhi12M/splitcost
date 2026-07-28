type BlogImageKind = "cover" | "inline";

function getStorageDateFolder(rootFolder: string, timestamp: Date) {
  const year = timestamp.getUTCFullYear();
  const monthNumber = String(timestamp.getUTCMonth() + 1).padStart(2, "0");

  return `${rootFolder}/${year}/${monthNumber}`;
}

function createStorageToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
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
  kind: BlogImageKind,
  timestamp = new Date(),
) {
  const folder = getStorageDateFolder("blogs", timestamp);
  const fileName =
    kind === "cover" ? "cover.webp" : `IMG-${createStorageToken()}.webp`;

  return `${folder}/BLOG-${blogId}/${fileName}`;
}
