// ============================================================
// RETINOVA — Shared UI Component Library
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  TextInputProps,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY } from '../utils/constants';

// ---- RetinovaLogo ----
export function RetinovaLogo({
  size = 'md',
  light = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}) {
  const dim = size === 'lg' ? 36 : size === 'sm' ? 22 : 28;
  const fontSize = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;
  const textColor = light ? '#FFFFFF' : COLORS.navy800;

  return (
    <View style={logoStyles.row}>
      <View
        style={[
          logoStyles.circle,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: light ? 'rgba(255,255,255,0.25)' : COLORS.teal800,
          },
        ]}
      >
        <View
          style={[
            logoStyles.pupil,
            {
              width: dim * 0.48,
              height: dim * 0.48,
              borderRadius: (dim * 0.48) / 2,
              borderColor: '#FFFFFF',
            },
          ]}
        >
          <View
            style={[
              logoStyles.core,
              {
                width: dim * 0.18,
                height: dim * 0.18,
                borderRadius: (dim * 0.18) / 2,
                backgroundColor: '#FFFFFF',
              },
            ]}
          />
        </View>
      </View>
      <Text style={[logoStyles.brandText, { fontSize, color: textColor }]}>
        RETINOVA
      </Text>
    </View>
  );
}
const logoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  pupil: { borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  core: {},
  brandText: {
    fontFamily: FONT_FAMILY.display,
    fontWeight: FONTS.weightBold,
    letterSpacing: 1.2,
  },
});

// ---- Card ----
export interface CardProps {
  children: React.ReactNode;
  style?: any;
  highlightColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}
export function Card({ children, style, highlightColor, onPress, accessibilityLabel }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          cardStyles.base,
          highlightColor ? { borderLeftColor: highlightColor, borderLeftWidth: 3.5 } : null,
          style,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View
      style={[
        cardStyles.base,
        highlightColor ? { borderLeftColor: highlightColor, borderLeftWidth: 3.5 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
});

// ---- RoleBadge ----
export function RoleBadge({ role }: { role: string }) {
  const displayRole = role === 'healthcare_worker' ? 'ASHA Worker' : role.replace('_', ' ');
  return (
    <View style={roleBadgeStyles.badge}>
      <Text style={roleBadgeStyles.text}>{displayRole.toUpperCase()}</Text>
    </View>
  );
}
const roleBadgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.teal50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    letterSpacing: 0.6,
    fontFamily: FONT_FAMILY.body,
  },
});

// ---- Button ----
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  small?: boolean;
}
export function Button({ title, onPress, variant = 'primary', disabled, loading, fullWidth, small }: ButtonProps) {
  const bg =
    variant === 'primary' ? COLORS.teal800 :
    variant === 'danger' ? COLORS.maroon700 :
    variant === 'secondary' ? 'transparent' : 'transparent';
  const borderColor =
    variant === 'outline' ? COLORS.teal800 :
    variant === 'secondary' ? COLORS.teal800 :
    variant === 'danger' ? COLORS.maroon700 : undefined;
  const textColor =
    variant === 'primary' ? COLORS.textInverse :
    variant === 'danger' ? COLORS.textInverse :
    variant === 'outline' ? COLORS.teal800 :
    variant === 'secondary' ? COLORS.teal800 : COLORS.textPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        btnStyles.base,
        { backgroundColor: bg, borderColor: borderColor, borderWidth: borderColor ? 1.5 : 0 },
        fullWidth && { alignSelf: 'stretch' },
        small && btnStyles.small,
        (disabled || loading) && { opacity: 0.5 },
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[btnStyles.label, { color: textColor }, small && btnStyles.labelSmall]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
const btnStyles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  small: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: FONTS.weightSemiBold,
    letterSpacing: 0.2,
    fontFamily: FONT_FAMILY.body,
  },
  labelSmall: { fontSize: FONTS.sizeSM },
});

// ---- FormInput ----
interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}
export function FormInput({ label, error, style, ...rest }: FormInputProps) {
  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <RNTextInput
        style={[inputStyles.input, error ? inputStyles.inputError : null, style]}
        placeholderTextColor={COLORS.textMuted}
        {...rest}
      />
      {error ? <Text style={inputStyles.errorText}>{error}</Text> : null}
    </View>
  );
}
const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONTS.sizeSM,
    fontWeight: FONTS.weightMedium,
    color: COLORS.navy700,
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.body,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONTS.sizeMD,
    color: COLORS.navy800,
    backgroundColor: COLORS.surface,
    minHeight: 48,
    fontFamily: FONT_FAMILY.body,
  },
  inputError: { borderColor: COLORS.maroon600 },
  errorText: { fontSize: FONTS.sizeXS, color: COLORS.maroon700, marginTop: 4, fontFamily: FONT_FAMILY.body },
});

// ---- StatusBadge ----
export type StatusBadgeType =
  | 'screen'
  | 'refer'
  | 'recapture'
  | 'pending'
  | 'neutral'
  | 'info'
  | 'urgent'
  | 'normal'
  | 'moderate'
  | 'high'
  | 'reviewed'
  | 'warning'
  | 'referral';

export interface StatusBadgeProps {
  label: string;
  type?: StatusBadgeType;
}
export function StatusBadge({ label, type = 'neutral' }: StatusBadgeProps) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    screen: { bg: COLORS.green50, text: COLORS.green700, border: COLORS.green100 },
    normal: { bg: COLORS.green50, text: COLORS.green700, border: COLORS.green100 },
    refer: { bg: COLORS.maroon50, text: COLORS.maroon700, border: COLORS.maroon100 },
    referral: { bg: COLORS.maroon50, text: COLORS.maroon700, border: COLORS.maroon100 },
    urgent: { bg: COLORS.maroon50, text: COLORS.maroon700, border: COLORS.maroon100 },
    high: { bg: COLORS.maroon50, text: COLORS.maroon700, border: COLORS.maroon100 },
    recapture: { bg: COLORS.amber50, text: COLORS.amber700, border: COLORS.amber100 },
    warning: { bg: COLORS.amber50, text: COLORS.amber700, border: COLORS.amber100 },
    moderate: { bg: COLORS.amber50, text: COLORS.amber700, border: COLORS.amber100 },
    pending: { bg: COLORS.teal50, text: COLORS.teal800, border: COLORS.teal100 },
    reviewed: { bg: COLORS.slate200, text: COLORS.slate700, border: COLORS.borderSubtle },
    info: { bg: COLORS.teal50, text: COLORS.navy600, border: COLORS.teal100 },
    neutral: { bg: COLORS.surfaceAlt, text: COLORS.slate500, border: COLORS.borderSubtle },
  };
  const c = colors[type] || colors.neutral;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[badgeStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: FONTS.weightSemiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.body,
  },
});

// ---- GradeBadge ----
export function GradeBadge({ grade, risk, size }: { grade: number | string; risk?: string; size?: 'small' | 'large' }) {
  // Normalize grade to a string like "G0" … "G4"
  const gradeNum = typeof grade === 'number' ? grade : parseInt(String(grade).replace(/[^0-9]/g, ''), 10);
  const displayGrade = `G${isNaN(gradeNum) ? grade : gradeNum}`;
  const isHigh = gradeNum >= 3;
  const labelText =
    gradeNum === 4 ? 'Proliferative' :
    gradeNum === 3 ? 'Severe NPDR' :
    gradeNum === 2 ? 'Moderate' :
    gradeNum === 1 ? 'Mild' : 'No DR';
  const bg = isHigh ? COLORS.maroon50 : COLORS.teal50;
  const border = isHigh ? COLORS.maroon100 : COLORS.teal100;
  const textColor = isHigh ? COLORS.maroon700 : COLORS.teal800;
  const isSmall = size === 'small';

  return (
    <View style={[gradeBadgeStyles.container, { backgroundColor: bg, borderColor: border }, isSmall && gradeBadgeStyles.containerSmall]}>
      <Text style={[gradeBadgeStyles.gradeText, { color: textColor }, isSmall && gradeBadgeStyles.gradeTextSmall]}>{displayGrade}</Text>
      <Text style={[gradeBadgeStyles.labelText, { color: textColor }, isSmall && gradeBadgeStyles.labelTextSmall]}>{labelText}</Text>
      {risk ? <Text style={gradeBadgeStyles.riskText}>Risk: {risk}</Text> : null}
    </View>
  );
}
const gradeBadgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 72,
  },
  containerSmall: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    minWidth: 48,
    borderRadius: RADIUS.sm,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    lineHeight: 22,
  },
  gradeTextSmall: {
    fontSize: 13,
    lineHeight: 16,
  },
  labelText: {
    fontSize: 9,
    fontWeight: FONTS.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  labelTextSmall: {
    fontSize: 8,
    marginTop: 1,
  },
  riskText: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 3,
    fontFamily: FONT_FAMILY.mono,
  },
});

// ---- PriorityBadge ----
export function PriorityBadge({ priority }: { priority: 'HIGH' | 'MODERATE' | 'NORMAL' | string }) {
  const p = (priority || 'NORMAL').toUpperCase();
  if (p === 'HIGH' || p === 'URGENT') {
    return <StatusBadge label="High Priority" type="refer" />;
  }
  if (p === 'MODERATE' || p === 'ROUTINE') {
    return <StatusBadge label="Moderate" type="warning" />;
  }
  return <StatusBadge label="Normal" type="screen" />;
}

// ---- ProgressBar ----
export function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View style={progStyles.track}>
      <View style={[progStyles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}
const progStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.teal700,
  },
});

// ---- AvatarInitial ----
export function AvatarInitial({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.teal50,
        borderColor: COLORS.teal100,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.42, fontWeight: FONTS.weightBold, color: COLORS.teal800, fontFamily: FONT_FAMILY.body }}>
        {initial}
      </Text>
    </View>
  );
}

// ---- SectionHeader ----
export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={secStyles.container}>
      <Text style={secStyles.title}>{title}</Text>
      <View style={secStyles.line} />
    </View>
  );
}
const secStyles = StyleSheet.create({
  container: { marginBottom: SPACING.md, paddingTop: SPACING.lg },
  title: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.body,
  },
  line: { height: 1, backgroundColor: COLORS.borderSubtle },
});

// ---- LoadingOverlay ----
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={loadStyles.container}>
      <ActivityIndicator color={COLORS.teal800} size="large" />
      <Text style={loadStyles.text}>{message}</Text>
    </View>
  );
}
const loadStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SPACING.xxxl },
  text: { marginTop: SPACING.lg, fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: 'center', fontFamily: FONT_FAMILY.body },
});

// ---- ErrorState ----
interface ErrorStateProps { message: string; onRetry?: () => void; onHome?: () => void; }
export function ErrorState({ message, onRetry, onHome }: ErrorStateProps) {
  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>!</Text>
      <Text style={errStyles.title}>Unable to Load Data</Text>
      <Text style={errStyles.message}>{message}</Text>
      <View style={errStyles.actions}>
        {onRetry && <Button title="Try Again" onPress={onRetry} variant="primary" />}
        {onHome && <Button title="Return Home" onPress={onHome} variant="outline" />}
      </View>
    </View>
  );
}
const errStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl, backgroundColor: COLORS.background },
  icon: { fontSize: 36, marginBottom: SPACING.md, color: COLORS.maroon700 },
  title: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.maroon700, marginBottom: SPACING.sm, textAlign: 'center', fontFamily: FONT_FAMILY.display },
  message: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl, fontFamily: FONT_FAMILY.body },
  actions: { gap: SPACING.md, width: '100%' },
});

// ---- EmptyState ----
interface EmptyStateProps { message: string; icon?: string; }
export function EmptyState({ message, icon = '—' }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={emptyStyles.text}>{message}</Text>
    </View>
  );
}
const emptyStyles = StyleSheet.create({
  container: { padding: SPACING.xxxl, alignItems: 'center' },
  icon: { fontSize: 32, marginBottom: SPACING.md, color: COLORS.textMuted },
  text: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: FONT_FAMILY.body },
});

// ---- Divider ----
export function Divider({ margin = true }: { margin?: boolean }) {
  return <View style={{ height: 1, backgroundColor: COLORS.borderSubtle, marginVertical: margin ? SPACING.md : 0 }} />;
}

// ---- InfoRow ----
export function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value !== undefined && value !== null && value !== '' ? String(value) : '—'}</Text>
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle, alignItems: 'flex-start' },
  label: { flex: 1.2, fontSize: FONTS.sizeSM, color: COLORS.slate500, fontWeight: FONTS.weightMedium, paddingRight: SPACING.sm, fontFamily: FONT_FAMILY.body },
  value: { flex: 2, fontSize: FONTS.sizeMD, color: COLORS.navy800, textAlign: 'right', fontFamily: FONT_FAMILY.body },
});

// ---- StatCard ----
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeType?: StatusBadgeType;
  color?: string;
  fullWidth?: boolean;
}
export function StatCard({ label, value, subtitle, badge, badgeType, color, fullWidth }: StatCardProps) {
  return (
    <View style={[statStyles.card, fullWidth && { width: '100%' }, color ? { borderLeftColor: color, borderLeftWidth: 3.5 } : null]}>
      <View style={statStyles.headerRow}>
        <Text style={statStyles.label}>{label}</Text>
        {badge && <StatusBadge label={badge} type={badgeType} />}
      </View>
      <Text style={[statStyles.value, color ? { color } : null]}>{value}</Text>
      {subtitle ? <Text style={statStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minWidth: 120,
    flex: 1,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  label: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: FONTS.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    flex: 1,
    marginRight: 4,
    fontFamily: FONT_FAMILY.body,
  },
  value: {
    fontSize: 22,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginVertical: 2,
    fontFamily: FONT_FAMILY.display,
  },
  subtitle: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
});

// ---- FilterChip ----
interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}
export function FilterChip({ label, active, onPress, count }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[chipStyles.chip, active && chipStyles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[chipStyles.label, active && chipStyles.labelActive]}>
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.teal50,
    borderColor: COLORS.teal800,
  },
  label: { fontSize: FONTS.sizeSM, color: COLORS.slate500, fontWeight: FONTS.weightMedium, fontFamily: FONT_FAMILY.body },
  labelActive: { color: COLORS.teal800, fontWeight: FONTS.weightBold },
});

// ---- RoleHeader ----
interface RoleHeaderProps {
  title: string;
  subtitle?: string;
  roleLabel: string;
  userName?: string;
  facilityName?: string;
  onLogout?: () => void;
}
export function RoleHeader({ title, subtitle, roleLabel, userName, facilityName, onLogout }: RoleHeaderProps) {
  const displayRole = roleLabel === 'healthcare_worker' ? 'ASHA Worker' : roleLabel;
  const displayFacility = facilityName || 'District Health Administration';

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={headerStyles.brandRow}>
            <RetinovaLogo size="sm" />
            <View style={headerStyles.roleBadge}>
              <Text style={headerStyles.roleBadgeText}>{displayRole}</Text>
            </View>
          </View>
          <Text style={headerStyles.title}>{title}</Text>
          {subtitle ? <Text style={headerStyles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={headerStyles.logoutBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={headerStyles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={headerStyles.metaRow}>
        {userName ? (
          <Text style={headerStyles.metaText}>{userName}</Text>
        ) : null}
        {userName && displayFacility ? <Text style={headerStyles.metaDot}>·</Text> : null}
        <Text style={headerStyles.metaText}>{displayFacility}</Text>
      </View>
    </View>
  );
}
const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  roleBadge: {
    backgroundColor: COLORS.teal50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.teal100,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    letterSpacing: 0.5,
    fontFamily: FONT_FAMILY.body,
  },
  title: {
    fontSize: FONTS.sizeLG,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginTop: 2,
  },
  subtitle: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  logoutText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate700,
    fontWeight: FONTS.weightSemiBold,
    fontFamily: FONT_FAMILY.body,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  metaDot: {
    marginHorizontal: 2,
    color: COLORS.slate400,
    fontSize: FONTS.sizeXS,
  },
});
