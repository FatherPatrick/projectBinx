import {useRef, useState} from 'react';
import {Dimensions, TouchableOpacity} from 'react-native';
import theme from '../../../styles/theme';

const FILTER_MENU_WIDTH = 170;
const FILTER_MENU_HEIGHT = 236;

const useCommentsFilterMenu = () => {
  const filterButtonRef = useRef<TouchableOpacity | null>(null);
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

  const handleOpenFilterMenu = () => {
    filterButtonRef.current?.measureInWindow((x, y, width, height) => {
      const preferredLeft = x + width - FILTER_MENU_WIDTH;
      const clampedLeft = Math.max(
        theme.spacing.sm,
        Math.min(
          preferredLeft,
          screenWidth - FILTER_MENU_WIDTH - theme.spacing.sm,
        ),
      );

      const preferredTop = y + height + theme.spacing.xs;
      const clampedTop = Math.min(
        preferredTop,
        screenHeight - FILTER_MENU_HEIGHT - theme.spacing.sm,
      );

      setFilterMenuPosition({top: clampedTop, left: clampedLeft});
      setIsFilterMenuVisible(true);
    });
  };

  return {
    filterButtonRef,
    isFilterMenuVisible,
    setIsFilterMenuVisible,
    filterMenuPosition,
    handleOpenFilterMenu,
    filterMenuWidth: FILTER_MENU_WIDTH,
  };
};

export default useCommentsFilterMenu;
