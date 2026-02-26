import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import styles from '../../../styles/homeStyles';
import {FeedSortOption} from '../hooks/useHomePollFeed';

interface SortOption {
  value: FeedSortOption;
  label: string;
}

interface HomeFilterMenuProps {
  visible: boolean;
  position: {top: number; left: number};
  menuWidth: number;
  selectedSort: FeedSortOption;
  options: SortOption[];
  onClose: () => void;
  onSelect: (value: FeedSortOption) => void;
}

const HomeFilterMenu: React.FC<HomeFilterMenuProps> = ({
  visible,
  position,
  menuWidth,
  selectedSort,
  options,
  onClose,
  onSelect,
}) => (
  <Modal
    transparent={true}
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}>
    <TouchableOpacity
      style={styles.filterBackdrop}
      activeOpacity={1}
      onPress={onClose}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <View
          style={[
            styles.filterMenuCard,
            {
              top: position.top,
              left: position.left,
              width: menuWidth,
            },
          ]}>
          {options.map(option => {
            const isSelected = option.value === selectedSort;

            return (
              <TouchableOpacity
                key={option.value}
                style={styles.filterOptionButton}
                onPress={() => onSelect(option.value)}>
                <Text
                  style={[
                    styles.filterOptionText,
                    isSelected ? styles.filterOptionTextSelected : null,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableWithoutFeedback>
    </TouchableOpacity>
  </Modal>
);

export default HomeFilterMenu;
