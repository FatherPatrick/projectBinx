import {StyleSheet} from 'react-native';
import theme from './theme';

const pollStyles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionButtonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
    width: '100%',
    borderWidth: 1,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primaryTint,
    borderColor: theme.colors.primary,
  },
  optionButtonUnselected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  optionText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textPrimary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    backgroundColor: theme.colors.primary,
  },
  radioOuterUnselected: {
    backgroundColor: theme.colors.surface,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  commentsButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  actionRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  iconActionButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.xs,
  },
  iconActionButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  commentsButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  moreButton: {
    position: 'absolute',
    top: 0,
    right: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    zIndex: 1,
  },
  moreButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    lineHeight: theme.fontSize.lg,
  },
});

export default pollStyles;
