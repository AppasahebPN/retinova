// ============================================================
// RETINOVA — Shared UI Component Library
// Institutional Public Health / Clinical Workstation Aesthetic
// ============================================================
import React from 'react';
import {
  TouchableOpacity, Text, View, ActivityIndicator,
  StyleSheet, TextInput as RNTextInput, TextInputProps,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

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
        activeOpacity={0.75}
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
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
});

// ---- RoleBadge ----
export function RoleBadge({ role }: { role: string }) {
  return (
    <View style={roleBadgeStyles.badge}>
      <Text style={roleBadgeStyles.text}>{role.toUpperCase()}</Text>
    </View>
  );
}
const roleBadgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.accent,
    letterSpacing: 0.8,
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
    variant === 'primary' ? COLORS.accent :
    variant === 'danger' ? COLORS.error :
    variant === 'secondary' ? COLORS.surface : 'transparent';
  const borderColor =
    variant === 'outline' ? COLORS.accent :
    variant === 'secondary' ? COLORS.accent :
    variant === 'danger' ? COLORS.error : undefined;
  const textColor =
    variant === 'primary' ? COLORS.textInverse :
    variant === 'danger' ? COLORS.textInverse :
    variant === 'outline' ? COLORS.accent :
    variant === 'secondary' ? COLORS.accent : COLORS.textPrimary;
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
      activeOpacity={0.75}
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
    paddingVertical: 13,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
  },
  label: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightSemiBold, letterSpacing: 0.4 },
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
  label: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONTS.sizeMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    minHeight: 48,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: FONTS.sizeXS, color: COLORS.error, marginTop: 4 },
});

// ---- StatusBadge ----
interface StatusBadgeProps {
  label: string;
  type?: 'screen' | 'refer' | 'recapture' | 'pending' | 'neutral' | 'info' | 'urgent';
}
export function StatusBadge({ label, type = 'neutral' }: StatusBadgeProps) {
  const colors = {
    screen: { bg: COLORS.decisionScreenBg, text: COLORS.decisionScreen, border: '#B6D4CE' },
    refer: { bg: COLORS.decisionReferBg, text: COLORS.decisionRefer, border: '#E5B8B8' },
    urgent: { bg: COLORS.decisionReferBg, text: COLORS.decisionRefer, border: '#E5B8B8' },
    recapture: { bg: COLORS.decisionRecaptureBg, text: COLORS.decisionRecapture, border: '#ECCBB8' },
    pending: { bg: COLORS.warningLight, text: COLORS.warning, border: '#ECCBB8' },
    info: { bg: COLORS.infoLight, text: COLORS.info, border: '#B8D0E8' },
    neutral: { bg: COLORS.surfaceAlt, text: COLORS.textSecondary, border: COLORS.border },
  };
  const c = colors[type];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[badgeStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightSemiBold, letterSpacing: 0.3 },
});

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
    fontSize: FONTS.sizeXS,
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  line: { height: 1, backgroundColor: COLORS.borderLight },
});

// ---- LoadingOverlay ----
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={loadStyles.container}>
      <ActivityIndicator color={COLORS.accent} size="large" />
      <Text style={loadStyles.text}>{message}</Text>
    </View>
  );
}
const loadStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SPACING.xxxl },
  text: { marginTop: SPACING.lg, fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: 'center' },
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
  icon: { fontSize: 36, marginBottom: SPACING.md },
  title: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.error, marginBottom: SPACING.sm, textAlign: 'center' },
  message: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl },
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
  text: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});

// ---- Divider ----
export function Divider({ margin = true }: { margin?: boolean }) {
  return <View style={{ height: 1, backgroundColor: COLORS.borderLight, marginVertical: margin ? SPACING.md : 0 }} />;
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
  row: { flexDirection: 'row', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, alignItems: 'flex-start' },
  label: { flex: 1.2, fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontWeight: FONTS.weightMedium, paddingRight: SPACING.sm },
  value: { flex: 2, fontSize: FONTS.sizeMD, color: COLORS.textPrimary, textAlign: 'right' },
});

// ---- StatCard ----
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeType?: 'screen' | 'refer' | 'pending' | 'neutral' | 'info' | 'urgent';
  color?: string;
  fullWidth?: boolean;
}
export function StatCard({ label, value, subtitle, badge, badgeType, color, fullWidth }: StatCardProps) {
  return (
    <View style={[statStyles.card, fullWidth && { width: '100%' }, color ? { borderLeftColor: color, borderLeftWidth: 3 } : null]}>
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
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 140,
    flex: 1,
    marginBottom: SPACING.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  label: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontWeight: FONTS.weightSemiBold, textTransform: 'uppercase', letterSpacing: 0.6, flex: 1, marginRight: 4 },
  value: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginVertical: 2 },
  subtitle: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2 },
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
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  label: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, fontWeight: FONTS.weightMedium },
  labelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
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
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={headerStyles.titleRow}>
            <Text style={headerStyles.appName}>RETINOVA</Text>
            <View style={headerStyles.roleBadge}>
              <Text style={headerStyles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={headerStyles.title}>{title}</Text>
          {subtitle ? <Text style={headerStyles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onLogout && (
          <TouchableOpacity onPress={onLogout} style={headerStyles.logoutBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sign out">
            <Text style={headerStyles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
      {(userName || facilityName) && (
        <View style={headerStyles.metaRow}>
          {userName ? (
            <Text style={headerStyles.metaText}>
              {userName}
            </Text>
          ) : null}
          {userName && facilityName ? <Text style={headerStyles.metaDot}>·</Text> : null}
          {facilityName ? (
            <Text style={headerStyles.metaText}>{facilityName}</Text>
          ) : null}
        </View>
      )}
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
    borderBottomColor: COLORS.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  appName: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2.5, marginRight: SPACING.sm },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent, letterSpacing: 0.5 },
  title: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightSemiBold, color: COLORS.textSecondary },
  subtitle: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  logoutBtn: { paddingVertical: 7, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  logoutText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACING.xs },
  metaText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  metaDot: { marginHorizontal: 2, color: COLORS.textMuted, fontSize: FONTS.sizeXS },
});
