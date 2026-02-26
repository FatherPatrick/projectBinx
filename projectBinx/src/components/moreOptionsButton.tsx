import React, {useRef, useState} from 'react';
import {
  Dimensions,
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import ConfirmDialog from './confirmDialog';
import theme from '../styles/theme';

interface MoreOptionsButtonProps {
  onDelete?: () => void;
  onHide?: () => void;
  itemType: 'comment' | 'poll';
  containerStyle?: StyleProp<ViewStyle>;
}

export const MoreOptionsButton: React.FC<MoreOptionsButtonProps> = ({
  onDelete,
  onHide,
  itemType,
  containerStyle,
}) => {
  const canDelete = Boolean(onDelete);
  const canHide = Boolean(onHide) && !canDelete;
  const menuWidth = 180;
  const menuHeight = canDelete || canHide ? 108 : 60;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({top: 0, left: 0});
  const buttonRef = useRef<TouchableOpacity | null>(null);

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleDelete = () => {
    setIsConfirmVisible(false);
    closeModal();
    onDelete?.();
  };

  const handleDeletePress = () => {
    closeModal();
    setIsConfirmVisible(true);
  };

  const handleHidePress = () => {
    closeModal();
    onHide?.();
  };

  const handleCancelDelete = () => {
    setIsConfirmVisible(false);
  };

  const handleOpenModal = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const preferredLeft = x + width - menuWidth;
      const clampedLeft = Math.max(
        theme.spacing.sm,
        Math.min(preferredLeft, screenWidth - menuWidth - theme.spacing.sm),
      );

      const preferredTop = y + height + theme.spacing.xs;
      const hasRoomBelow =
        preferredTop + menuHeight <= screenHeight - theme.spacing.sm;

      const top = hasRoomBelow
        ? preferredTop
        : Math.max(theme.spacing.sm, y - menuHeight - theme.spacing.xs);

      setMenuPosition({top, left: clampedLeft});
      setIsModalVisible(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={[styles.moreButton, containerStyle]}
        onPress={handleOpenModal}>
        <Text style={styles.moreButtonText}>...</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={closeModal}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeModal}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.modalCard,
                {
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuWidth,
                },
              ]}>
              {canHide ? (
                <TouchableOpacity
                  style={styles.hideButton}
                  onPress={handleHidePress}>
                  <Text style={styles.hideButtonText}>Hide {itemType}</Text>
                </TouchableOpacity>
              ) : null}

              {canDelete ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeletePress}>
                  <Text style={styles.deleteButtonText}>Delete {itemType}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={isConfirmVisible && Boolean(onDelete)}
        title={`Delete ${itemType}?`}
        message={`Are you sure you want to delete this ${itemType}? This action cannot be undone.`}
        confirmLabel={`Delete ${itemType}`}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

const styles = StyleSheet.create({
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalCard: {
    position: 'absolute',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  deleteButton: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerStrong,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hideButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hideButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default MoreOptionsButton;
