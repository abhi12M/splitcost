/** Landing page section bands — alternate default / muted for clear visual rhythm. */
export const landingSection = {
  padding: "py-10 sm:py-16 md:py-20",
  default: "bg-background",
  alternate: "bg-muted/30",
  divider: "border-border/60",
} as const;

/** Tailwind class groups aligned to SplitCost logo tokens (#2563FF, #0B132B). */
export const brandStyles = {
  sectionBadge:
    "inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary dark:bg-primary-muted dark:text-primary/90",
  headingAccent: "text-primary dark:text-primary/90",
  iconCircle: "bg-primary/10 dark:bg-primary-muted",
  icon: "text-primary dark:text-primary/90",
  iconSm: "text-primary/80 dark:text-primary/75",
  ctaPanel:
    "overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5 shadow-card ring-1 ring-primary/15 dark:border-primary/25 dark:from-primary-muted/40 dark:via-card dark:to-primary-muted/15 dark:shadow-none dark:ring-primary/20",
  ctaIconCircle:
    "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
  featureIconBg: "bg-primary/10 dark:bg-primary-muted",
  featureIconColor: "text-primary dark:text-primary/90",
} as const;

export const brandFeatureAccent = {
  iconBg: brandStyles.featureIconBg,
  iconColor: brandStyles.featureIconColor,
} as const;

export const brandStepAccent = {
  badgeBg: "bg-primary/10 dark:bg-primary-muted",
  badgeText: "text-primary dark:text-primary/90",
  iconBg: brandStyles.iconCircle,
  iconColor: brandStyles.icon,
  arrow: "text-primary/60 dark:text-primary/50",
} as const;

export const brandProblemAccent = {
  iconWrap: "bg-primary text-primary-foreground ring-primary/20 dark:ring-primary/30",
  bar: "bg-primary/80 dark:bg-primary/70",
  scene: "bg-primary/5 dark:bg-primary-muted/50",
  panelBorder: "border-primary/20 dark:border-primary/30",
  accentIcon: brandStyles.icon,
  accentBg: brandStyles.iconCircle,
} as const;

export const brandUseCaseAccent = {
  iconBg: "bg-primary",
  tagBg: "bg-primary/10 dark:bg-primary-muted",
  tagText: "text-primary dark:text-primary/90",
  sceneBg: "from-primary/5 to-primary/10 dark:from-primary-muted/40 dark:to-primary-muted/20",
} as const;

/** Balance / settlement semantics (success & destructive tokens). */
export const balanceStyles = {
  positiveText: "text-success",
  negativeText: "text-destructive",
  positiveSummary: "text-success dark:text-success/90",
  negativeSummary: "text-destructive dark:text-destructive/90",
  positiveCard: "rounded-2xl border bg-success/10 p-4 dark:bg-success/15",
  positiveCardLabel: "text-sm text-success dark:text-success/90",
  positiveCardValue: "mt-2 text-2xl font-semibold text-success dark:text-success/90",
  negativeCard: "rounded-2xl border bg-destructive/10 p-4 dark:bg-destructive/15",
  negativeCardLabel: "text-sm text-destructive dark:text-destructive/90",
  negativeCardValue: "mt-2 text-2xl font-semibold text-destructive dark:text-destructive/90",
  warningCard: "rounded-2xl border bg-warning/10 p-4 dark:bg-warning/15 sm:col-span-3",
  warningCardLabel: "text-sm text-warning dark:text-warning/90",
  warningCardValue:
    "mt-2 text-2xl font-semibold text-foreground dark:text-foreground",
  positiveMemberBorder:
    "border-success/30 bg-gradient-to-r from-success/10 to-card dark:from-success/15",
  negativeMemberBorder:
    "border-destructive/30 bg-gradient-to-r from-destructive/10 to-card dark:from-destructive/15",
  positiveMemberBorderSubtle: "border-success/30",
  negativeMemberBorderSubtle: "border-destructive/30",
  positiveBadge: "border-success/30 bg-success/10 text-success dark:text-success/90",
  negativeBadge:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive/90",
} as const;

export const fieldErrorStyles = {
  text: "text-destructive",
  textHover: "text-destructive hover:text-destructive/90",
  border: "border-destructive border-b-destructive text-destructive",
  borderAria:
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:border-b-destructive",
} as const;

export const validationStyles = {
  validText: "text-success",
  invalidText: "text-destructive",
  validBg: "bg-success",
} as const;

/** Pie chart slices — brand blue + muted category hues (readable in dark mode). */
export const chartPalette = [
  "hsl(221 78% 58%)",
  "hsl(142 50% 48%)",
  "hsl(38 88% 52%)",
  "hsl(200 55% 48%)",
  "hsl(25 75% 52%)",
  "hsl(280 55% 52%)",
] as const;

export const fabButtonClass =
  "shadow-lg transition hover:bg-primary/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]";
