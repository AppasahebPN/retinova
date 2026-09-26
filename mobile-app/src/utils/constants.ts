// ============================================================
// RETINOVA — Design System Constants
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================

import { Platform } from "react-native";

// API base URL - configured via Settings screen or .env
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) || "";

// ---- Typography Families (Figma Design System) ----
export const FONT_FAMILY = {
  display: Platform.select({
    web: "'DM Serif Display', Georgia, serif",
    ios: "Georgia",
    android: "serif",
    default: "serif",
  }),
  body: Platform.select({
    web: "'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: undefined,
  }),
  mono: Platform.select({
    web: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

// ---- Figma Color Palette ----
export const COLORS = {
  // Backgrounds & Surfaces (Figma source)
  background: "transparent",    // Transparent so the rich background image is visible across all pages
  backgroundBase: "#F4EFE8",    // Figma primary background baseline
  surface: "#FFFFFF",           // Clean white card surface
  surfaceAlt: "#FDFAF7",        // Raised surface
  surfaceElevated: "#FFFFFF",

  // Text
  textPrimary: "#152845",       // navy-800
  textSecondary: "#64748B",     // slate-500
  textMuted: "#94A3B8",         // slate-400
  textInverse: "#FFFFFF",

  // Primary Teal Scale (Figma primary)
  accent: "#0D5E5E",            // teal-800 (Figma primary action)
  accentLight: "#EAF6F6",       // teal-50
  accentDark: "#0A4A4A",        // teal-900
  primary: "#0D5E5E",           // alias for teal-800 primary
  white: "#FFFFFF",             // explicit white

  // Extended Teal Scale
  teal900: "#0A4A4A",
  teal800: "#0D5E5E",
  teal700: "#0F7070",
  teal600: "#118080",
  teal500: "#149090",
  teal200: "#A8DADA",
  teal100: "#D4EEEE",
  teal50: "#EAF6F6",

  // Navy Scale
  navy900: "#0F1E36",
  navy800: "#152845",
  navy700: "#1A3254",
  navy600: "#1E3A63",
  navy500: "#254980",

  // Maroon Scale (Urgent / High Priority / Referral)
  maroon900: "#4A0A14",
  maroon800: "#6B1020",
  maroon700: "#8B1A2B",
  maroon600: "#A82135",
  maroon200: "#E8A8B2",
  maroon100: "#F5D5DA",
  maroon50: "#FDF0F2",

  // Amber Scale (Moderate / Warning)
  amber700: "#B45309",
  amber600: "#D97706",
  amber100: "#FEF3C7",
  amber50: "#FFFBEB",

  // Green Scale (Normal / Success)
  green700: "#15653A",
  green100: "#D1FAE5",
  green50: "#ECFDF5",

  // Slate Scale
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",

  // Borders
  border: "#DDD5C8",
  borderLight: "#EDE8E0",
  borderSubtle: "#EDE8E0",

  // Semantic states
  success: "#15653A",
  successLight: "#ECFDF5",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  error: "#8B1A2B",
  errorLight: "#FDF0F2",
  info: "#1E3A63",
  infoLight: "#D4EEEE",

  // Clinical decision outcomes (Strictly shared across all roles)
  decisionScreen: "#15653A",
  decisionScreenBg: "#ECFDF5",
  decisionRefer: "#8B1A2B",
  decisionReferBg: "#FDF0F2",
  decisionRecapture: "#B45309",
  decisionRecaptureBg: "#FFFBEB",
};

export const FONTS = {
  sizeXS: 11,
  sizeSM: 13,
  sizeMD: 14,
  sizeLG: 16,
  sizeXL: 18,
  size2XL: 22,
  size3XL: 28,
  weightNormal: "400" as const,
  weightMedium: "500" as const,
  weightSemiBold: "600" as const,
  weightBold: "700" as const,
  familyDisplay: FONT_FAMILY.display,
  familyBody: FONT_FAMILY.body,
  familyMono: FONT_FAMILY.mono,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Figma corner radius standards
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 99,
};

export const SHADOWS = {
  card: {
    shadowColor: "#0F1E36",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHover: {
    shadowColor: "#0F1E36",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const GRADE_LABELS: Record<number, string> = {
  0: "No DR (Grade 0)",
  1: "Mild DR (Grade 1)",
  2: "Moderate DR (Grade 2)",
  3: "Severe DR (Grade 3)",
  4: "Proliferative DR (Grade 4)",
};

export const GRADE_SHORT: Record<number, string> = {
  0: "G0",
  1: "G1",
  2: "G2",
  3: "G3",
  4: "G4",
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "@netraai_auth_token",
  USER_DATA: "@netraai_user_data",
  API_BASE_URL: "@netraai_api_base_url",
};
