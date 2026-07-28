type BuildStoragePathOptions = {
  rootFolder: string;
  entityPrefix: string;
  entityId: string;
  fileName: string;
  timestamp?: Date;
};

function sanitizeStorageFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";

  return `${baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file"}${extension}`;
}

function formatStorageTimestamp(timestamp: Date) {
  return timestamp
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
}

function getStorageDateFolder(
  rootFolder: string,
  timestamp: Date
) {
  const year = timestamp.getUTCFullYear();
  const monthNumber = String(timestamp.getUTCMonth() + 1).padStart(2, "0");
  const monthName = timestamp.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return `${rootFolder}/${year}/${monthNumber}_${monthName}`;
}

export function buildStoragePath({
  rootFolder,
  entityPrefix,
  entityId,
  fileName,
  timestamp = new Date(),
}: BuildStoragePathOptions) {
  const folder = getStorageDateFolder(rootFolder, timestamp);
  const safeFileName = sanitizeStorageFileName(fileName);
  const isoTimestamp = formatStorageTimestamp(timestamp);

  return `${folder}/${entityPrefix}-${entityId}-${isoTimestamp}-${safeFileName}`;
}
