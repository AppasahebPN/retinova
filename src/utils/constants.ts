// ============================================================
// RETINOVA — Design System Constants
// Institutional Public Health & Clinical Workstation Aesthetic
// ============================================================

// API base URL - configured via Settings screen or .env
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) || "";

// ---- Color palette (Style 3 — Rural Screening Operations) ----
export const COLORS = {
  // Backgrounds
  background: "#E8DCC5",       // --paper: warm neutral rural health background
  surface: "#FFFDF8",          // --paper-raised: clean warm white surfaces
  surfaceAlt: "#F2EAD9",       // slightly tinted paper surface
  surfaceElevated: "#FFFFFF",

  // Text
  textPrimary: "#14202E",       // --ink: deep readable navy text
  textSecondary: "#5C6672",     // --slate: muted supporting text
  textMuted: "#7F8B98",
  textInverse: "#FFFFFF",

  // Primary: Restrained rural health teal
  accent: "#1B6357",            // --teal: primary brand & action color
  accentLight: "#E2ECE9",
  accentDark: "#144D44",

  // Borders
  border: "#DCD6C9",           // --line: thin restrained borders
  borderLight: "#EFEAE1",

  // Semantic states (restrained, clinical)
  success: "#1B6357",
  successLight: "#E2ECE9",
  warning: "#C1652F",           // --amber: warnings, pending states
  warningLight: "#F9EFEA",
  error: "#9C3B3B",             // --maroon: referral, urgent, danger
  errorLight: "#F7ECEC",
  info: "#24587A",
  infoLight: "#E6F0F6",

  // Clinical decision outcomes (Strictly shared across all roles)
  decisionScreen: "#1B6357",
  decisionScreenBg: "#E2ECE9",
  decisionRefer: "#9C3B3B",
  decisionReferBg: "#F7ECEC",
  decisionRecapture: "#C1652F",
  decisionRecaptureBg: "#F9EFEA",
};

export const FONTS = {
  sizeXS: 11,
  sizeSM: 13,
  sizeMD: 15,
  sizeLG: 17,
  sizeXL: 20,
  size2XL: 24,
  size3XL: 30,
  weightNormal: "400" as const,
  weightMedium: "500" as const,
  weightSemiBold: "600" as const,
  weightBold: "700" as const,
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

// Medium corner radius (8-12px)
export const RADIUS = {
  sm: 4,
  md: 10,
  lg: 12,
};

export const GRADE_LABELS: Record<number, string> = {
  0: "No DR (Grade 0)",
  1: "Mild DR (Grade 1)",
  2: "Moderate DR (Grade 2)",
  3: "Severe DR (Grade 3)",
  4: "Proliferative DR (Grade 4)",
};

export const GRADE_SHORT: Record<number, string> = {
  0: "G0", 1: "G1", 2: "G2", 3: "G3", 4: "G4",
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "@netraai_auth_token",
  USER_DATA: "@netraai_user_data",
  API_BASE_URL: "@netraai_api_base_url",
};
