import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import globalStyles from '../../../styles/globalStyles';
import styles from '../../../styles/homeStyles';

interface HomeFilterHeaderProps {
  filterButtonRef: React.RefObject<TouchableOpacity>;
  onOpenFilterMenu: () => void;
}

const HomeFilterHeader: React.FC<HomeFilterHeaderProps> = ({
  filterButtonRef,
  onOpenFilterMenu,
}) => (
  <View>
    <View style={styles.titleRow}>
      <Text style={globalStyles.title}>Polls</Text>
      <TouchableOpacity
        ref={filterButtonRef}
        style={styles.filterButton}
        onPress={onOpenFilterMenu}>
        <View style={styles.filterIconBar} />
        <View style={styles.filterIconBar} />
        <View style={styles.filterIconBar} />
      </TouchableOpacity>
    </View>
  </View>
);

export default HomeFilterHeader;
