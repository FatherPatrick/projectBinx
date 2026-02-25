import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import PollService from '../services/pollService';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import {MainTabParamList} from '../types/navigation';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
  route: RouteProp<MainTabParamList, 'Home'>;
}

const Home: React.FC<Props> = ({navigation, route}) => {
  const PAGE_SIZE = 25;
  const MAX_OVERSCROLL_MULTIPLIER = 1.6;
  const OVERSCROLL_GAIN = 1.1;
  const OVERSCROLL_CURVE = 1.8;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [polls, setPolls] = useState<PollData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
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

        if (pageToLoad === 1) {
          setPolls(fetchedPolls);
        } else {
          setPolls(previousPolls =>
            mergeUniquePolls(previousPolls, fetchedPolls),
          );
        }

        setPage(pageToLoad);
        setHasMore(fetchedPolls.length === PAGE_SIZE);
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
    [PAGE_SIZE, mergeUniquePolls],
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

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return (
        <SimplePoll
          poll={poll}
          onPollDeleted={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'slider') {
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
          onPollDeleted={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'multi') {
      return (
        <MultiPoll poll={poll} onPollDeleted={() => removePollFromFeed(poll)} />
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

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {transform: [{translateY: springOffset}]},
      ]}>
      <FlatList
        data={polls}
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
        ListHeaderComponent={<Text style={globalStyles.title}>Polls</Text>}
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
});

export default Home;
