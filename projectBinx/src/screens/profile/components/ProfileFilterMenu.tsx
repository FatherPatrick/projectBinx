import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import profileStyles from '../../../styles/profileScreenStyles';

interface ProfileFilterMenuProps<TValue extends string> {
  visible: boolean;
  options: Array<{value: TValue; label: string}>;
  selectedValue: TValue;
  position: {
    top: number;
    left: number;
  };
  width: number;
  onClose: () => void;
  onSelect: (value: TValue) => void;
}

const ProfileFilterMenu = <TValue extends string>({
  visible,
  options,
  selectedValue,
  position,
  width,
  onClose,
  onSelect,
}: ProfileFilterMenuProps<TValue>) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={profileStyles.filterBackdrop}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View
            style={[
              profileStyles.filterMenuCard,
              {
                top: position.top,
                left: position.left,
                width,
              },
            ]}>
            {options.map(option => {
              const isSelected = option.value === selectedValue;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={profileStyles.filterOptionButton}
                  onPress={() => onSelect(option.value)}>
                  <Text
                    style={[
                      profileStyles.filterOptionText,
                      isSelected
                        ? profileStyles.filterOptionTextSelected
                        : null,
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
};

export default ProfileFilterMenu;
