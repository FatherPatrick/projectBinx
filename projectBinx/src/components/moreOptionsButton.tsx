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
import theme from '../styles/theme';

interface MoreOptionsButtonProps {
  onDelete: () => void;
  itemType: 'comment' | 'poll';
  containerStyle?: StyleProp<ViewStyle>;
}

export const MoreOptionsButton: React.FC<MoreOptionsButtonProps> = ({
  onDelete,
  itemType,
  containerStyle,
}) => {
  const menuWidth = 180;
  const menuHeight = 108;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({top: 0, left: 0});
  const buttonRef = useRef<TouchableOpacity | null>(null);

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleDelete = () => {
    closeModal();
    onDelete();
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
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete {itemType}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
