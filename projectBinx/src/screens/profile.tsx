import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import PollService from '../services/pollService';
import LoginService from '../services/loginService';
import SessionService from '../services/sessionService';
import LocationService from '../services/locationService';
import AnonymousNameService from '../services/anonymousNameService';
import {PollData} from '../types/pollTypes';
import {RootStackParamList} from '../types/navigation';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import AmaPoll from '../components/pollTypes/amaPoll';
import ConfirmDialog from '../components/confirmDialog';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

type ProfileSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-comments'
  | 'least-comments'
  | 'newest'
  | 'oldest';

const PROFILE_SORT_OPTIONS: Array<{value: ProfileSortOption; label: string}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-comments', label: 'Most Comments'},
  {value: 'least-comments', label: 'Least Comments'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLogoutPromptVisible, setIsLogoutPromptVisible] = useState(false);
  const [isDeletePromptVisible, setIsDeletePromptVisible] = useState(false);
  const [isDeletePhraseModalVisible, setIsDeletePhraseModalVisible] =
    useState(false);
  const [sortBy, setSortBy] = useState<ProfileSortOption>('newest');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletePhraseError, setDeletePhraseError] = useState<string | null>(
    null,
  );
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const filterButtonRef = React.useRef<TouchableOpacity | null>(null);
  const FILTER_MENU_WIDTH = 170;
  const FILTER_MENU_HEIGHT = 236;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const springOffset = React.useRef(new Animated.Value(0)).current;
  const touchStartYRef = React.useRef<number | null>(null);
  const isSpringDraggingRef = React.useRef(false);
  const scrollMetricsRef = React.useRef({
    offsetY: 0,
    contentHeight: 0,
    containerHeight: 0,
  });

  const sessionUser = SessionService.getCurrentUser();
  const [anonymousAlias, setAnonymousAlias] = useState(
    sessionUser?.anonymousAlias ??
      AnonymousNameService.getDeterministicAlias(sessionUser?.username ?? ''),
  );
  const [profileAvatar, setProfileAvatar] = useState(() =>
    AnonymousNameService.sanitizeAvatar(
      {
        initials: sessionUser?.profileAvatarInitials,
        backgroundColor: sessionUser?.profileAvatarColor,
      },
      sessionUser?.username ?? '',
      sessionUser?.displayName,
    ),
  );

  const profileInfo = useMemo(
    () => ({
      name: anonymousAlias,
      bio: sessionUser?.phoneNumber
        ? `Phone: ${sessionUser.phoneNumber}`
        : sessionUser?.email
        ? `Email: ${sessionUser.email}`
        : 'Welcome to your profile.',
    }),
    [sessionUser?.phoneNumber, sessionUser?.email, anonymousAlias],
  );

  const handleRegenerateAlias = async () => {
    const updatedUser = await SessionService.regenerateAnonymousAlias();

    if (updatedUser?.anonymousAlias) {
      setAnonymousAlias(updatedUser.anonymousAlias);
    }
  };

  const handleRegenerateProfilePicture = async () => {
    const updatedUser = await SessionService.regenerateProfileAvatar();

    setProfileAvatar(
      AnonymousNameService.sanitizeAvatar(
        {
          initials: updatedUser?.profileAvatarInitials,
          backgroundColor: updatedUser?.profileAvatarColor,
        },
        updatedUser?.username ?? sessionUser?.username ?? '',
        updatedUser?.displayName ?? sessionUser?.displayName,
      ),
    );
  };

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
        const location = await LocationService.getCurrentPositionWithPermission(
          {
            maximumAge: 60000,
          },
        );

        const fetchedPolls = await PollService.getPagedPolls({
          user: username,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          viewerLatitude: location.latitude,
          viewerLongitude: location.longitude,
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

  const openDeletePrompt = () => {
    setDeletePhrase('');
    setDeletePhraseError(null);
    setIsDeletePromptVisible(true);
  };

  const closeDeletePrompt = () => {
    if (!isDeletingAccount) {
      setIsDeletePromptVisible(false);
    }
  };

  const proceedToDeletePhraseStep = () => {
    setIsDeletePromptVisible(false);
    setDeletePhrase('');
    setDeletePhraseError(null);
    setIsDeletePhraseModalVisible(true);
  };

  const closeDeletePhraseModal = () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletePhraseModalVisible(false);
    setDeletePhrase('');
    setDeletePhraseError(null);
  };

  const handleDeleteAccount = async () => {
    const normalizedPhrase = deletePhrase.trim().toLowerCase();

    if (normalizedPhrase !== 'deletemyaccount') {
      setDeletePhraseError('Type DeleteMyAccount to confirm account deletion.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeletePhraseError(null);

      const currentUser = SessionService.getCurrentUser();

      await LoginService.deleteAccount({
        userId: currentUser?.id,
        phoneNumber: currentUser?.phoneNumber,
        email: currentUser?.email,
        confirmationPhrase: deletePhrase,
      });

      await SessionService.clearCurrentUser();
      setIsDeletePhraseModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{name: 'CreateAccount'}],
      });
    } catch (error) {
      setDeletePhraseError('Unable to delete account right now.');
      setIsDeletingAccount(false);
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

  const sortedPostHistory = useMemo(() => {
    const nextPolls = [...postHistory];

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
  }, [postHistory, sortBy]);

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

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return (
        <SimplePoll
          poll={poll}
          onPollDeleted={() => removePollFromHistory(poll)}
          onPollHidden={() => removePollFromHistory(poll)}
        />
      );
    } else if (poll.type === 'slider') {
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
          onPollDeleted={() => removePollFromHistory(poll)}
          onPollHidden={() => removePollFromHistory(poll)}
        />
      );
    } else if (poll.type === 'ama') {
      return (
        <AmaPoll
          poll={poll}
          onPollDeleted={() => removePollFromHistory(poll)}
          onPollHidden={() => removePollFromHistory(poll)}
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
        data={!isLoading && !errorMessage ? sortedPostHistory : []}
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
              <View
                style={[
                  styles.profileImagePlaceholder,
                  {backgroundColor: profileAvatar.backgroundColor},
                ]}>
                <Text style={styles.profileImageText}>
                  {profileAvatar.initials}
                </Text>
              </View>

              <View style={styles.profileDetails}>
                <Text style={styles.name}>{profileInfo.name}</Text>
                <View style={styles.regenerateButtonsRow}>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerateAlias}>
                    <Text style={styles.regenerateButtonText}>
                      Regenerate Name
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerateProfilePicture}>
                    <Text style={styles.regenerateButtonText}>
                      Regenerate Picture
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.bio}>{profileInfo.bio}</Text>

                <View style={styles.accountActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.logoutButton,
                      isLoggingOut ? styles.logoutButtonDisabled : null,
                    ]}
                    disabled={isLoggingOut}
                    onPress={openLogoutPrompt}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteAccountButton,
                      isDeletingAccount ? styles.logoutButtonDisabled : null,
                    ]}
                    disabled={isDeletingAccount}
                    onPress={openDeletePrompt}>
                    <Text style={styles.deleteAccountButtonText}>
                      Delete Account
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.historySection}>
              <View style={styles.historyHeaderRow}>
                <Text style={globalStyles.sectionTitle}>Post History</Text>
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

            {isLoading ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null}

            {errorMessage ? (
              <Text style={globalStyles.errorText}>{errorMessage}</Text>
            ) : null}

            {!isLoading && !errorMessage && sortedPostHistory.length === 0 ? (
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

            <ConfirmDialog
              visible={isDeletePromptVisible}
              title="Delete account"
              message="Are you sure you want to delete your account? Your posts and comments will remain."
              confirmLabel="Continue"
              cancelLabel="Cancel"
              isProcessing={isDeletingAccount}
              onConfirm={proceedToDeletePhraseStep}
              onCancel={closeDeletePrompt}
            />
          </>
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
              {PROFILE_SORT_OPTIONS.map(option => {
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

      <Modal
        transparent={true}
        visible={isDeletePhraseModalVisible}
        animationType="fade"
        onRequestClose={closeDeletePhraseModal}>
        <TouchableOpacity
          style={styles.deleteModalBackdrop}
          activeOpacity={1}
          onPress={closeDeletePhraseModal}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.deleteModalCard}>
              <Text style={styles.deleteModalTitle}>Final confirmation</Text>
              <Text style={styles.deleteModalMessage}>
                Type DeleteMyAccount to permanently delete your account.
              </Text>

              <TextInput
                style={styles.deleteInput}
                value={deletePhrase}
                onChangeText={value => {
                  setDeletePhrase(value);
                  if (deletePhraseError) {
                    setDeletePhraseError(null);
                  }
                }}
                editable={!isDeletingAccount}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="DeleteMyAccount"
              />

              {deletePhraseError ? (
                <Text style={styles.deleteErrorText}>{deletePhraseError}</Text>
              ) : null}

              <View style={styles.deleteModalActionsRow}>
                <TouchableOpacity
                  style={styles.deleteCancelButton}
                  disabled={isDeletingAccount}
                  onPress={closeDeletePhraseModal}>
                  <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteConfirmButton,
                    isDeletingAccount ? styles.logoutButtonDisabled : null,
                  ]}
                  disabled={isDeletingAccount}
                  onPress={handleDeleteAccount}>
                  <Text style={styles.deleteConfirmButtonText}>
                    {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    color: theme.colors.onPrimary,
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
  regenerateButtonsRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  regenerateButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  bio: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  accountActionsRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.xs,
  },
  deleteAccountButton: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerStrong,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  deleteAccountButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
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
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  deleteModalCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  deleteModalTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  deleteModalMessage: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.base,
  },
  deleteInput: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.base,
  },
  deleteErrorText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
  deleteModalActionsRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  deleteCancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  deleteCancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerStrong,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  deleteConfirmButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});

export default Profile;
