import {StyleSheet} from 'react-native';
import theme from './theme';

const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  screenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  input: {
    width: '100%',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    width: '100%',
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  successText: {
    width: '100%',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  mutedText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  linkText: {
    color: theme.colors.link,
    textDecorationLine: 'underline',
  },
});

export default globalStyles;
