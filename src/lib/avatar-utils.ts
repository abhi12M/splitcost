// Deterministic avatar colors based on name
const AVATAR_COLORS = [
  { bg: "168 55% 42%", fg: "0 0% 100%" },    // Teal
  { bg: "16 85% 60%", fg: "0 0% 100%" },     // Coral
  { bg: "280 65% 55%", fg: "0 0% 100%" },    // Purple
  { bg: "200 60% 50%", fg: "0 0% 100%" },    // Blue
  { bg: "340 70% 55%", fg: "0 0% 100%" },    // Pink
  { bg: "45 85% 50%", fg: "220 20% 15%" },   // Yellow
  { bg: "142 55% 45%", fg: "0 0% 100%" },    // Green
  { bg: "25 90% 55%", fg: "0 0% 100%" },     // Orange
  { bg: "220 60% 55%", fg: "0 0% 100%" },    // Indigo
  { bg: "180 50% 45%", fg: "0 0% 100%" },    // Cyan
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getAvatarColor(name: string): { bg: string; fg: string } {
  const hash = hashString(name.toLowerCase().trim());
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
