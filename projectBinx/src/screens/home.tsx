import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import PollService from '../services/pollService';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import AmaPoll from '../components/pollTypes/amaPoll';
import {MainTabParamList} from '../types/navigation';
import SessionService from '../services/sessionService';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
  route: RouteProp<MainTabParamList, 'Home'>;
}

type FeedSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-comments'
  | 'least-comments'
  | 'newest'
  | 'oldest';

const FEED_SORT_OPTIONS: Array<{value: FeedSortOption; label: string}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-comments', label: 'Most Comments'},
  {value: 'least-comments', label: 'Least Comments'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

const Home: React.FC<Props> = ({navigation, route}) => {
  const PAGE_SIZE = 25;
  const MAX_OVERSCROLL_MULTIPLIER = 1.6;
  const OVERSCROLL_GAIN = 1.1;
  const OVERSCROLL_CURVE = 1.8;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [polls, setPolls] = useState<PollData[]>([]);
  const currentUsername = SessionService.getCurrentUser()?.username;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<FeedSortOption>('newest');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const filterButtonRef = React.useRef<TouchableOpacity | null>(null);
  const FILTER_MENU_WIDTH = 170;
  const FILTER_MENU_HEIGHT = 164;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const springOffset = React.useRef(new Animated.Value(0)).current;
  const touchStartYRef = React.useRef<number | null>(null);
  const isSpringDraggingRef = React.useRef(false);
  const scrollMetricsRef = React.useRef({
    offsetY: 0,
    contentHeight: 0,
    containerHeight: 0,
  });

  useEffect(() => {
    const createdPoll = route.params?.createdPoll;

    if (!createdPoll) {
      return;
    }

    setPolls(previousPolls => [createdPoll, ...previousPolls]);
    navigation.setParams({createdPoll: undefined});
  }, [navigation, route.params?.createdPoll]);

  const mergeUniquePolls = useCallback(
    (existing: PollData[], incoming: PollData[]) => {
      const existingIds = new Set(
        existing.map(item =>
          item.pollId !== undefined
            ? `id-${String(item.pollId)}`
            : `key-${item.user}-${item.title}`,
        ),
      );

      const uniqueIncoming = incoming.filter(item => {
        const key =
          item.pollId !== undefined
            ? `id-${String(item.pollId)}`
            : `key-${item.user}-${item.title}`;

        if (existingIds.has(key)) {
          return false;
        }

        existingIds.add(key);
        return true;
      });

      return [...existing, ...uniqueIncoming];
    },
    [],
  );

  const withReactionCounts = useCallback(
    async (items: PollData[]): Promise<PollData[]> => {
      const itemsNeedingSummary = items.filter(
        item =>
          item.pollId !== undefined &&
          (item.likes === undefined || item.dislikes === undefined),
      );

      if (itemsNeedingSummary.length === 0) {
        return items;
      }

      const summaries = await Promise.allSettled(
        itemsNeedingSummary.map(item =>
          PollService.getPollReactionById(item.pollId!, currentUsername),
        ),
      );

      const summaryByPollId = new Map<
        number,
        {likes: number; dislikes: number}
      >();
      summaries.forEach((result, index) => {
        const pollId = itemsNeedingSummary[index].pollId;
        if (pollId === undefined || result.status !== 'fulfilled') {
          return;
        }

        summaryByPollId.set(pollId, {
          likes: result.value.likes,
          dislikes: result.value.dislikes,
        });
      });

      return items.map(item => {
        if (item.pollId === undefined) {
          return item;
        }

        const summary = summaryByPollId.get(item.pollId);
        if (!summary) {
          return {
            ...item,
            likes: item.likes ?? 0,
            dislikes: item.dislikes ?? 0,
          };
        }

        return {
          ...item,
          likes: summary.likes,
          dislikes: summary.dislikes,
        };
      });
    },
    [currentUsername],
  );

  const fetchPolls = useCallback(
    async ({
      pageToLoad,
      isRefresh = false,
    }: {
      pageToLoad: number;
      isRefresh?: boolean;
    }) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const fetchedPolls = await PollService.getPagedPolls({
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        const hydratedPolls = await withReactionCounts(fetchedPolls);

        if (pageToLoad === 1) {
          setPolls(hydratedPolls);
        } else {
          setPolls(previousPolls =>
            mergeUniquePolls(previousPolls, hydratedPolls),
          );
        }

        setPage(pageToLoad);
        setHasMore(hydratedPolls.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        }
        setIsLoadingMore(false);
        setLoading(false);
      }
    },
    [PAGE_SIZE, mergeUniquePolls, withReactionCounts],
  );

  useEffect(() => {
    fetchPolls({pageToLoad: 1});
  }, [fetchPolls]);

  const handleRefresh = () => {
    setHasMore(true);
    fetchPolls({pageToLoad: 1, isRefresh: true});
  };

  const handleLoadMore = () => {
    if (loading || refreshing || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    fetchPolls({pageToLoad: page + 1});
  };

  const removePollFromFeed = (poll: PollData) => {
    setPolls(previousPolls =>
      previousPolls.filter(existingPoll => {
        if (poll.pollId !== undefined && existingPoll.pollId !== undefined) {
          return existingPoll.pollId !== poll.pollId;
        }

        return !(
          existingPoll.title === poll.title && existingPoll.user === poll.user
        );
      }),
    );
  };

  const getPollCreatedTimestamp = (poll: PollData): number => {
    if (poll.createdAt) {
      const parsedTimestamp = Date.parse(poll.createdAt);
      if (!Number.isNaN(parsedTimestamp)) {
        return parsedTimestamp;
      }
    }

    if (poll.pollId !== undefined) {
      return poll.pollId;
    }

    return 0;
  };

  const sortedPolls = useMemo(() => {
    const nextPolls = [...polls];

    nextPolls.sort((leftPoll, rightPoll) => {
      if (sortBy === 'most-liked') {
        return (rightPoll.likes ?? 0) - (leftPoll.likes ?? 0);
      }

      if (sortBy === 'most-disliked') {
        return (rightPoll.dislikes ?? 0) - (leftPoll.dislikes ?? 0);
      }

      if (sortBy === 'most-comments') {
        return (rightPoll.commentCount ?? 0) - (leftPoll.commentCount ?? 0);
      }

      if (sortBy === 'least-comments') {
        return (leftPoll.commentCount ?? 0) - (rightPoll.commentCount ?? 0);
      }

      const leftTimestamp = getPollCreatedTimestamp(leftPoll);
      const rightTimestamp = getPollCreatedTimestamp(rightPoll);

      if (sortBy === 'oldest') {
        return leftTimestamp - rightTimestamp;
      }

      return rightTimestamp - leftTimestamp;
    });

    return nextPolls;
  }, [polls, sortBy]);

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return (
        <SimplePoll
          poll={poll}
          onPollDeleted={() => removePollFromFeed(poll)}
          onPollHidden={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'slider') {
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
          onPollDeleted={() => removePollFromFeed(poll)}
          onPollHidden={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'ama') {
      return (
        <AmaPoll
          poll={poll}
          onPollDeleted={() => removePollFromFeed(poll)}
          onPollHidden={() => removePollFromFeed(poll)}
        />
      );
    }
    return null;
  };

  const handleTouchStart = (pageY: number) => {
    touchStartYRef.current = pageY;
  };

  const getRubberBandOffset = (
    dragDistance: number,
    containerHeight: number,
  ) => {
    const safeHeight = Math.max(containerHeight, 1);
    const scaledOffset =
      (dragDistance * OVERSCROLL_GAIN) /
      (1 + dragDistance / (safeHeight * OVERSCROLL_CURVE));

    return Math.min(scaledOffset, safeHeight * MAX_OVERSCROLL_MULTIPLIER);
  };

  const handleTouchMove = (pageY: number) => {
    if (touchStartYRef.current === null) {
      return;
    }

    const deltaY = pageY - touchStartYRef.current;
    const {offsetY, contentHeight, containerHeight} = scrollMetricsRef.current;
    const maxOffset = Math.max(contentHeight - containerHeight, 0);
    const atTop = offsetY <= 0;
    const atBottom = offsetY >= maxOffset - 1;

    if (atTop && deltaY > 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(getRubberBandOffset(deltaY, containerHeight));
      return;
    }

    if (atBottom && deltaY < 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(
        -getRubberBandOffset(Math.abs(deltaY), containerHeight),
      );
      return;
    }

    if (isSpringDraggingRef.current) {
      springOffset.setValue(0);
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;

    if (!isSpringDraggingRef.current) {
      return;
    }

    isSpringDraggingRef.current = false;
    Animated.spring(springOffset, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
      mass: 0.8,
    }).start();
  };

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

  const filterHeader = (
    <View>
      <View style={styles.titleRow}>
        <Text style={globalStyles.title}>Polls</Text>
        <TouchableOpacity
          ref={filterButtonRef}
          style={styles.filterButton}
          onPress={handleOpenFilterMenu}>
          <View style={styles.filterIconBar} />
          <View style={styles.filterIconBar} />
          <View style={styles.filterIconBar} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {transform: [{translateY: springOffset}]},
      ]}>
      <FlatList
        data={sortedPolls}
        renderItem={({item}) => renderPoll(item)}
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
        onScroll={({nativeEvent}) => {
          scrollMetricsRef.current = {
            offsetY: nativeEvent.contentOffset.y,
            contentHeight: nativeEvent.contentSize.height,
            containerHeight: nativeEvent.layoutMeasurement.height,
          };
        }}
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
        ListHeaderComponent={filterHeader}
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

      <Modal
        transparent={true}
        visible={isFilterMenuVisible}
        animationType="fade"
        onRequestClose={() => setIsFilterMenuVisible(false)}>
        <TouchableOpacity
          style={styles.filterBackdrop}
          activeOpacity={1}
          onPress={() => setIsFilterMenuVisible(false)}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.filterMenuCard,
                {
                  top: filterMenuPosition.top,
                  left: filterMenuPosition.left,
                  width: FILTER_MENU_WIDTH,
                },
              ]}>
              {FEED_SORT_OPTIONS.map(option => {
                const isSelected = option.value === sortBy;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.filterOptionButton}
                    onPress={() => {
                      setSortBy(option.value);
                      setIsFilterMenuVisible(false);
                    }}>
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  listContent: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  filterIconBar: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.textSecondary,
  },
  filterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  filterMenuCard: {
    position: 'absolute',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  filterOptionButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  filterOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  filterOptionTextSelected: {
    color: theme.colors.primary,
  },
});

export default Home;
