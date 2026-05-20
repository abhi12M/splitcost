import { cn } from "@/lib/utils";
import React from "react";

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const iconStyle = "stroke-current fill-none";

// Entertainment Icons
export const GameIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="9" cy="12" r="2" />
    <path d="M15 10v4" />
    <path d="M13 12h4" />
  </svg>
);

export const MovieIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 8h20" />
    <path d="M2 16h20" />
    <path d="M6 4v4" />
    <path d="M18 4v4" />
    <path d="M6 16v4" />
    <path d="M18 16v4" />
  </svg>
);

export const MusicIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
    <path d="M11 18V5l10-2v13" />
  </svg>
);

export const SportsIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12h20" />
  </svg>
);

// Food & Drink Icons
export const DiningIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 3v8a4 4 0 0 0 8 0V3" />
    <path d="M11 3v18" />
    <path d="M19 3v4c0 2-1 3-3 3" />
  </svg>
);

export const GroceriesIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const LiquorIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 22h8" />
    <path d="M12 11v11" />
    <path d="M5 3l4 7h6l4-7z" />
    <path d="M9 10a3 3 0 1 0 6 0" />
  </svg>
);

// Home Icons
export const ElectronicsIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
);

export const FurnitureIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
    <path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z" />
    <path d="M4 19v2" />
    <path d="M20 19v2" />
  </svg>
);

export const HouseholdIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const MaintenanceIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const MortgageIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const RentIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
    <circle cx="12" cy="15" r="2" />
    <path d="M12 13v-1" />
    <path d="M12 17v1" />
  </svg>
);

export const PetsIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="6" rx="2" ry="3" />
    <ellipse cx="16" cy="6" rx="2" ry="3" />
    <ellipse cx="5" cy="12" rx="2" ry="3" />
    <ellipse cx="19" cy="12" rx="2" ry="3" />
    <path d="M12 18c-4 0-6-2-6-5a4 4 0 0 1 6-3 4 4 0 0 1 6 3c0 3-2 5-6 5z" />
  </svg>
);

export const ServicesIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Life Icons
export const ChildcareIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="4" r="2" />
    <path d="M12 6v6" />
    <path d="M8 10h8" />
    <path d="M12 12l-4 10" />
    <path d="M12 12l4 10" />
  </svg>
);

export const EducationIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export const InsuranceIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const MedicalIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M12 10v6" />
    <path d="M9 13h6" />
  </svg>
);

export const ClothingIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3l6 2 6-2 3 4-3 2v13H6V9L3 7z" />
    <path d="M12 5v4" />
  </svg>
);

export const GiftsIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="14" rx="1" />
    <path d="M12 8v14" />
    <path d="M3 12h18" />
    <path d="M12 8c-2-2-4-2-4 0s2 2 4 0c2-2 4-2 4 0s-2 2-4 0" />
  </svg>
);

export const TaxesIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

// Utilities Icons
export const ElectricityIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const GasHeatIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c-4 4-6 8-6 12a6 6 0 1 0 12 0c0-4-2-8-6-12z" />
    <path d="M12 12c-1 1-2 3-2 4a2 2 0 1 0 4 0c0-1-1-3-2-4z" />
  </svg>
);

export const WaterIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c-4 5-7 8-7 13a7 7 0 1 0 14 0c0-5-3-8-7-13z" />
  </svg>
);

export const TrashIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

export const InternetIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1" />
  </svg>
);

// Transportation Icons
export const BicycleIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="17" r="3" />
    <circle cx="19" cy="17" r="3" />
    <path d="M12 17l-3.5-7h7L12 17z" />
    <path d="M9 10l3-6" />
    <path d="M15.5 10l2 4" />
  </svg>
);

export const BusTrainIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="16" rx="2" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <circle cx="8" cy="15" r="1" />
    <circle cx="16" cy="15" r="1" />
    <path d="M6 19l-2 2" />
    <path d="M18 19l2 2" />
  </svg>
);

export const CarIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
    <circle cx="7.5" cy="17.5" r="2.5" />
    <circle cx="16.5" cy="17.5" r="2.5" />
    <path d="M5 12h14" />
  </svg>
);

export const GasFuelIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
    <path d="M7 10h4" />
    <path d="M15 8l2 2 2-4 2 2v8a2 2 0 0 1-2 2h-2" />
  </svg>
);

export const ParkingIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
  </svg>
);

export const PlaneIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
);

export const TaxiIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4h6l2 3h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l2-3z" />
    <circle cx="7" cy="15" r="2" />
    <circle cx="17" cy="15" r="2" />
    <path d="M5 11h14" />
  </svg>
);

export const HotelIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </svg>
);

export const TravelIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={cn(iconStyle, className)}
    style={style}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M6 18l6-12 6 12H6z" />  {/* Simple mountain/peak to represent sightseeing */}
    <path d="M9 15h6" />              {/* Path/road detail */}
  </svg>
);


// General/Uncategorized
export const GeneralIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

export const ReceiptIcon = ({ className, size = 24, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn(iconStyle, className)} style={style} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h4" />
  </svg>
);

export { BrandIcon } from "@/components/brand/BrandIcon";

export const CashIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={cn(iconStyle, className)}
    style={style}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7 9h.01" />
    <path d="M17 15h.01" />
  </svg>
);


// Category mapping with subcategories
export const EXPENSE_CATEGORIES = {
  entertainment: {
    label: "Entertainment",
    color: "category-entertainment",
    subcategories: [
      { id: "games", label: "Games", icon: GameIcon, keywords: ["game", "gaming", "console", "playstation", "xbox", "pc game", "mobile game"] },
      { id: "movies", label: "Movies", icon: MovieIcon, keywords: ["movie", "cinema", "theatre", "film", "imax", "netflix"] },
      { id: "music", label: "Music", icon: MusicIcon, keywords: ["music", "song", "album", "concert", "spotify", "apple music"] },
      { id: "sports", label: "Sports", icon: SportsIcon, keywords: ["sports", "gym", "fitness", "match", "training", "equipment"] },
      {
        id: "sightseeing",
        label: "Sightseeing/Attractions",
        icon: TravelIcon,
        keywords: [
          "taj mahal", "red fort", "amber fort", "gateway of india", "india gate",
          "lotus temple", "mysore palace", "charminar", "hawa mahal", "sun temple",
          "park", "zoo", "amusement park", "museum", "fort", "monument", "temple",
          "historical site", "tourism", "travel", "hill station", "beach", "lake",
          "palace", "national park", "wildlife sanctuary", "heritage site", "fortress",
          "sightseeing", "excursion", "trip", "holiday", "vacation","visit","ticket"
        ]
      }

    ],
  },
  food: {
    label: "Food & Drink",
    color: "category-food",
    subcategories: [
      { id: "dining", label: "Dining Out", icon: DiningIcon, keywords: ["food", "restaurant", "dining", "lunch", "dinner", "cafe", "zomato", "swiggy", "tea", 'coffee', "chai", "samosa", "pakoda", "dosa", "kachodi", "khasta","batashe","pani puri","gol gappe"] },
      { id: "groceries", label: "Groceries", icon: GroceriesIcon, keywords: ["groceries", "vegetables", "fruits", "supermarket", "ration", "daily needs", "milk"] },
      { id: "liquor", label: "Liquor", icon: LiquorIcon, keywords: ["liquor", "alcohol", "beer", "wine", "whiskey", "vodka", "bar"] },
    ],
  },
  home: {
    label: "Home",
    color: "category-home",
    subcategories: [
      { id: "electronics", label: "Electronics", icon: ElectronicsIcon, keywords: ["electronics", "mobile", "laptop", "gadgets", "charger", "headphones"] },
      { id: "furniture", label: "Furniture", icon: FurnitureIcon, keywords: ["furniture", "sofa", "bed", "table", "chair", "almirah"] },
      { id: "household", label: "Household", icon: HouseholdIcon, keywords: ["household", "cleaning", "home items", "daily use", "utensils"] },
      { id: "maintenance", label: "Maintenance", icon: MaintenanceIcon, keywords: ["maintenance", "repair", "fix", "society", "service"] },
      { id: "mortgage", label: "Mortgage", icon: MortgageIcon, keywords: ["mortgage", "home loan", "housing loan", "emi"] },
      { id: "rent", label: "Rent", icon: RentIcon, keywords: ["rent", "house rent", "flat rent", "monthly rent"] },
      { id: "pets", label: "Pets", icon: PetsIcon, keywords: ["pets", "pet food", "vet", "dog", "cat"] },
      { id: "services", label: "Services", icon: ServicesIcon, keywords: ["services", "cleaning", "plumber", "electrician", "salon"] },
    ],
  },
  life: {
    label: "Life",
    color: "category-life",
    subcategories: [
      { id: "childcare", label: "Childcare", icon: ChildcareIcon, keywords: ["childcare", "daycare", "baby", "nanny", "kids"] },
      { id: "education", label: "Education", icon: EducationIcon, keywords: ["education", "school", "college", "fees", "tuition", "course"] },
      { id: "insurance", label: "Insurance", icon: InsuranceIcon, keywords: ["insurance", "premium", "health insurance", "life insurance"] },
      { id: "medical", label: "Medical", icon: MedicalIcon, keywords: ["medical", "hospital", "doctor", "medicine", "pharmacy", "health"] },
      { id: "clothing", label: "Clothing", icon: ClothingIcon, keywords: ["clothing", "clothes", "shopping", "shirt", "pants", "dress"] },
      { id: "gifts", label: "Gifts", icon: GiftsIcon, keywords: ["gifts", "present", "birthday", "anniversary", "festival"] },
      { id: "taxes", label: "Taxes", icon: TaxesIcon, keywords: ["tax", "taxes", "gst", "income tax", "property tax"] },
    ],
  },
  utilities: {
    label: "Utilities",
    color: "category-utilities",
    subcategories: [
      { id: "electricity", label: "Electricity", icon: ElectricityIcon, keywords: ["electricity", "power bill", "light bill", "current bill"] },
      { id: "gas", label: "Gas/Heat", icon: GasHeatIcon, keywords: ["gas", "lpg", "cooking gas", "heat", "pipeline gas"] },
      { id: "water", label: "Water", icon: WaterIcon, keywords: ["water", "water bill"] },
      { id: "trash", label: "Trash", icon: TrashIcon, keywords: ["trash", "garbage", "waste", "municipal"] },
      { id: "internet", label: "TV/Phone/Internet", icon: InternetIcon, keywords: ["internet", "wifi", "broadband", "mobile bill", "phone bill", "tv"] },
    ],
  },
  transportation: {
    label: "Transportation",
    color: "category-transportation",
    subcategories: [
      { id: "bicycle", label: "Bicycle", icon: BicycleIcon, keywords: ["bicycle", "cycle", "bike repair"] },
      { id: "bus", label: "Bus/Train", icon: BusTrainIcon, keywords: ["bus", "train", "metro", "public transport"] },
      { id: "car", label: "Car", icon: CarIcon, keywords: ["car", "vehicle", "car service", "repair"] },
      { id: "fuel", label: "Gas/Fuel", icon: GasFuelIcon, keywords: ["fuel", "petrol", "diesel", "gas"] },
      { id: "parking", label: "Parking", icon: ParkingIcon, keywords: ["parking", "parking fee"] },
      { id: "plane", label: "Plane", icon: PlaneIcon, keywords: ["flight", "plane", "airfare"] },
      { id: "taxi", label: "Taxi", icon: TaxiIcon, keywords: ["taxi", "cab", "uber", "ola","auto"] },
      { id: "hotel", label: "Hotel", icon: HotelIcon, keywords: ["hotel", "stay", "lodging", "accommodation"] },
    ],
  },
  settlement: {
    label: "Settlement",
    color: "category-cash",
    subcategories: [
      { id: "settle_up", label: "Settle up", icon: CashIcon, keywords: ["settle up", "Record payment"] },
    ],
  },
  uncategorized: {
    label: "Uncategorized",
    color: "category-uncategorized",
    subcategories: [
      { id: "general", label: "General", icon: GeneralIcon, keywords: ["general", "misc", "other", "unknown"] },
    ],
  },
} as const;

export type CategoryKey = keyof typeof EXPENSE_CATEGORIES;
export type SubcategoryId = string;

export function getCategoryIcon(categoryKey: CategoryKey, subcategoryId?: SubcategoryId) {
  const category = EXPENSE_CATEGORIES[categoryKey];
  if (!category) return GeneralIcon;

  if (subcategoryId) {
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (subcategory) return subcategory.icon;
  }

  return category.subcategories[0]?.icon || GeneralIcon;
}
