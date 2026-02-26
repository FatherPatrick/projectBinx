import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {MainTabParamList} from '../../types/navigation';
import {FeedSortOption} from './hooks/useHomePollFeed';
import useHomePollFeed from './hooks/useHomePollFeed';
import useHomeSpringOverscroll from './hooks/useHomeSpringOverscroll';
import HomePollItem from './components/HomePollItem';
import HomeFilterHeader from './components/HomeFilterHeader';
import HomeFilterMenu from './components/HomeFilterMenu';
import globalStyles from '../../styles/globalStyles';
import styles from '../../styles/homeStyles';
import theme from '../../styles/theme';

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
  route: RouteProp<MainTabParamList, 'Home'>;
}

const FEED_SORT_OPTIONS: Array<{value: FeedSortOption; label: string}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-comments', label: 'Most Comments'},
  {value: 'least-comments', label: 'Least Comments'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

const FILTER_MENU_WIDTH = 170;
const FILTER_MENU_HEIGHT = 164;

const HomeScreen: React.FC<Props> = ({navigation, route}) => {
  const {
    loading,
    refreshing,
    isLoadingMore,
    sortBy,
    setSortBy,
    sortedPolls,
    removePollFromFeed,
    prependPoll,
    handleRefresh,
    handleLoadMore,
  } = useHomePollFeed();

  const {
    animatedStyle,
    handleScrollMetrics,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useHomeSpringOverscroll();

  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const filterButtonRef = React.useRef<TouchableOpacity | null>(null);
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

  useEffect(() => {
    const createdPoll = route.params?.createdPoll;

    if (!createdPoll) {
      return;
    }

    prependPoll(createdPoll);
    navigation.setParams({createdPoll: undefined});
  }, [navigation, prependPoll, route.params?.createdPoll]);

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

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.animatedContainer, animatedStyle]}>
      <FlatList
        data={sortedPolls}
        renderItem={({item}) => (
          <HomePollItem
            poll={item}
            onRemovePoll={removePollFromFeed}
            onSliderInteractingChange={setIsSliderInteracting}
          />
        )}
        keyExtractor={(item, index) =>
          item.pollId !== undefined
            ? item.pollId.toString()
            : `${item.user}-${item.title}-${index}`
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        progressViewOffset={theme.spacing.xxl}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        onScroll={({nativeEvent}) => handleScrollMetrics(nativeEvent)}
        onTouchStart={({nativeEvent}) => handleTouchStart(nativeEvent.pageY)}
        onTouchMove={({nativeEvent}) => handleTouchMove(nativeEvent.pageY)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onScrollEndDrag={handleTouchEnd}
        onMomentumScrollEnd={handleTouchEnd}
        scrollEventThrottle={16}
        scrollEnabled={!isSliderInteracting}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <HomeFilterHeader
            filterButtonRef={filterButtonRef}
            onOpenFilterMenu={handleOpenFilterMenu}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No polls available yet.</Text>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />

      <HomeFilterMenu
        visible={isFilterMenuVisible}
        position={filterMenuPosition}
        menuWidth={FILTER_MENU_WIDTH}
        selectedSort={sortBy}
        options={FEED_SORT_OPTIONS}
        onClose={() => setIsFilterMenuVisible(false)}
        onSelect={value => {
          setSortBy(value);
          setIsFilterMenuVisible(false);
        }}
      />
    </Animated.View>
  );
};

export default HomeScreen;
