import {StyleSheet} from 'react-native';
import theme from './theme';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formScroll: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.xl,
    paddingBottom: 30,
  },
  containerWithStickyPreview: {
    paddingBottom: 360,
  },
  title: {
    fontWeight: '700',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: theme.fontSize.base,
  },
  pollTypeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pollTypeButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  pollTypeButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  pollTypeButtonUnselected: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pollTypeButtonText: {
    fontWeight: '600',
  },
  pollTypeButtonTextSelected: {
    color: theme.colors.primary,
  },
  pollTypeButtonTextUnselected: {
    color: theme.colors.textPrimary,
  },
  pollTypeHelpText: {
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontSize: theme.fontSize.md,
  },
  simplePresetRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  simplePresetButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sliderPreviewContainer: {
    marginBottom: 16,
  },
  stickyPreviewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stickyPreviewCard: {
    width: '100%',
  },
  stickyPreviewBody: {
    maxHeight: 220,
  },
  stickyPreviewBodyContent: {
    paddingBottom: 4,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    position: 'relative',
    marginTop: 4,
    marginBottom: 8,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: -6,
    marginLeft: -9,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  simplePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  simplePreviewButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  simplePreviewButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  amaPreviewRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: theme.colors.dangerStrong,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 16,
    marginTop: 4,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});

export default styles;
