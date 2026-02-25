import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

const Profile = () => {
  const TOP_SPRING_PULL_LIMIT = 56;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postHistory, setPostHistory] = useState<PollData[]>([]);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const springOffset = React.useRef(new Animated.Value(0)).current;
  const touchStartYRef = React.useRef<number | null>(null);
  const isSpringDraggingRef = React.useRef(false);
  const scrollMetricsRef = React.useRef({
    offsetY: 0,
    contentHeight: 0,
    containerHeight: 0,
  });

  const sessionUser = SessionService.getCurrentUser();

  const profileInfo = useMemo(
    () => ({
      name: sessionUser?.displayName ?? 'User',
      username: `@${sessionUser?.username ?? 'current_user'}`,
      bio: sessionUser?.phoneNumber
        ? `Phone: ${sessionUser.phoneNumber}`
        : 'Welcome to your profile.',
    }),
    [sessionUser?.displayName, sessionUser?.phoneNumber, sessionUser?.username],
  );

  const fetchPostHistory = useCallback(
    async (isRefresh = false) => {
      const username = sessionUser?.username;

      if (isRefresh) {
        setIsRefreshing(true);
      }

      if (!username) {
        setPostHistory([]);
        setIsLoading(false);
        if (isRefresh) {
          setIsRefreshing(false);
        }
        return;
      }

      try {
        setErrorMessage(null);
        const fetchedPolls = await PollService.getPagedPolls({user: username});

        const userPolls = fetchedPolls.filter(
          poll => poll.user.toLowerCase() === username.toLowerCase(),
        );
        setPostHistory(userPolls);
      } catch (error) {
        setErrorMessage('Unable to load post history right now.');
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        }
        setIsLoading(false);
      }
    },
    [sessionUser?.username],
  );

  useEffect(() => {
    fetchPostHistory();
  }, [fetchPostHistory]);

  const handleRefresh = () => {
    fetchPostHistory(true);
  };

  const removePollFromHistory = (poll: PollData) => {
    setPostHistory(previousPolls =>
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

  const profileInitial = profileInfo.name.charAt(0).toUpperCase();

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return (
        <SimplePoll
          poll={poll}
          onPollDeleted={() => removePollFromHistory(poll)}
        />
      );
    } else if (poll.type === 'slider') {
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
          onPollDeleted={() => removePollFromHistory(poll)}
        />
      );
    } else if (poll.type === 'multi') {
      return (
        <MultiPoll
          poll={poll}
          onPollDeleted={() => removePollFromHistory(poll)}
        />
      );
    }

    return null;
  };

  const handleTouchStart = (pageY: number) => {
    touchStartYRef.current = pageY;
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

    if (atTop && deltaY > 0 && deltaY <= TOP_SPRING_PULL_LIMIT) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(deltaY * 0.35);
      return;
    }

    if (atTop && deltaY > TOP_SPRING_PULL_LIMIT) {
      if (isSpringDraggingRef.current) {
        springOffset.setValue(0);
        isSpringDraggingRef.current = false;
      }
      return;
    }

    if (atBottom && deltaY < 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(deltaY * 0.35);
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

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {transform: [{translateY: springOffset}]},
      ]}>
      <FlatList
        data={!isLoading && !errorMessage ? postHistory : []}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={(item, index) =>
          item.pollId ? String(item.pollId) : `${item.title}-${index}`
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        progressViewOffset={theme.spacing.xxl}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
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
        onMomentumScrollEnd={handleTouchEnd}
        scrollEventThrottle={16}
        scrollEnabled={!isSliderInteracting}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>{profileInitial}</Text>
              </View>

              <View style={styles.profileDetails}>
                <Text style={styles.name}>{profileInfo.name}</Text>
                <Text style={styles.username}>{profileInfo.username}</Text>
                <Text style={styles.bio}>{profileInfo.bio}</Text>
              </View>
            </View>

            <View style={styles.historySection}>
              <Text style={globalStyles.sectionTitle}>Post History</Text>
            </View>

            {isLoading ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null}

            {errorMessage ? (
              <Text style={globalStyles.errorText}>{errorMessage}</Text>
            ) : null}

            {!isLoading && !errorMessage && postHistory.length === 0 ? (
              <Text style={styles.emptyText}>No posts yet.</Text>
            ) : null}
          </>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.avatarPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
  },
  username: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  bio: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  historySection: {
    marginTop: 24,
  },
  statusContainer: {
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});

export default Profile;
