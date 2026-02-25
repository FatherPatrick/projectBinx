import React from 'react';
import {
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import theme from '../styles/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isProcessing = false,
  onConfirm,
  onCancel,
  containerStyle,
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, containerStyle]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              disabled={isProcessing}
              onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isProcessing ? styles.confirmButtonDisabled : null,
              ]}
              disabled={isProcessing}
              onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>
                {isProcessing ? 'Please wait...' : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.base,
    marginTop: theme.spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.xs,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});

export default ConfirmDialog;
