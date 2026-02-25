import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import {PollData} from '../types/pollTypes';
import {RootStackParamList} from '../types/navigation';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import ConfirmDialog from '../components/confirmDialog';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

const Profile = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const PAGE_SIZE = 25;
  const MAX_OVERSCROLL_MULTIPLIER = 1.6;
  const OVERSCROLL_GAIN = 1.1;
  const OVERSCROLL_CURVE = 1.8;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postHistory, setPostHistory] = useState<PollData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutPromptVisible, setIsLogoutPromptVisible] = useState(false);
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

  const fetchPostHistory = useCallback(
    async ({
      pageToLoad,
      isRefresh = false,
    }: {
      pageToLoad: number;
      isRefresh?: boolean;
    }) => {
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
        const fetchedPolls = await PollService.getPagedPolls({
          user: username,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        const userPolls = fetchedPolls.filter(
          poll => poll.user.toLowerCase() === username.toLowerCase(),
        );

        if (pageToLoad === 1) {
          setPostHistory(userPolls);
        } else {
          setPostHistory(previousPolls =>
            mergeUniquePolls(previousPolls, userPolls),
          );
        }

        setPage(pageToLoad);
        setHasMore(userPolls.length === PAGE_SIZE);
      } catch (error) {
        setErrorMessage('Unable to load post history right now.');
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        }
        setIsLoadingMore(false);
        setIsLoading(false);
      }
    },
    [PAGE_SIZE, mergeUniquePolls, sessionUser?.username],
  );

  useEffect(() => {
    fetchPostHistory({pageToLoad: 1});
  }, [fetchPostHistory]);

  const handleRefresh = () => {
    setHasMore(true);
    fetchPostHistory({pageToLoad: 1, isRefresh: true});
  };

  const handleLoadMore = () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    fetchPostHistory({pageToLoad: page + 1});
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await SessionService.clearCurrentUser();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      setErrorMessage('Unable to logout right now.');
      setIsLoggingOut(false);
    }
  };

  const openLogoutPrompt = () => {
    setIsLogoutPromptVisible(true);
  };

  const closeLogoutPrompt = () => {
    if (!isLoggingOut) {
      setIsLogoutPromptVisible(false);
    }
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
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
        onTouchCancel={handleTouchEnd}
        onMomentumScrollEnd={handleTouchEnd}
        scrollEventThrottle={16}
        scrollEnabled={!isSliderInteracting}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
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

                <TouchableOpacity
                  style={[
                    styles.logoutButton,
                    isLoggingOut ? styles.logoutButtonDisabled : null,
                  ]}
                  disabled={isLoggingOut}
                  onPress={openLogoutPrompt}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
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

            <ConfirmDialog
              visible={isLogoutPromptVisible}
              title="Logout"
              message="Are you sure you want to logout?"
              confirmLabel="Logout"
              cancelLabel="Stay Logged In"
              isProcessing={isLoggingOut}
              onConfirm={handleLogout}
              onCancel={closeLogoutPrompt}
            />
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
  logoutButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
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
  footerLoader: {
    paddingVertical: theme.spacing.md,
  },
});

export default Profile;
