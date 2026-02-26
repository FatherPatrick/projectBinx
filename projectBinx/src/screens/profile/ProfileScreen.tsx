import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import SessionService from '../../services/sessionService';
import AnonymousNameService from '../../services/anonymousNameService';
import {PollData} from '../../types/pollTypes';
import {RootStackParamList} from '../../types/navigation';
import SimplePoll from '../../components/pollTypes/SimplePoll';
import SliderPoll from '../../components/pollTypes/SliderPoll';
import AmaPoll from '../../components/pollTypes/AmaPoll';
import ConfirmDialog from '../../components/ConfirmDialog';
import globalStyles from '../../styles/globalStyles';
import profileStyles from '../../styles/profileScreenStyles';
import ProfileHeader from './components/ProfileHeader';
import ProfileFilterMenu from './components/ProfileFilterMenu';
import ProfileDeleteAccountModal from './components/ProfileDeleteAccountModal';
import useProfilePostHistory, {
  ProfileSortOption,
} from './hooks/useProfilePostHistory';
import useProfileAccountActions from './hooks/useProfileAccountActions';
import useProfileSpringOverscroll from './hooks/useProfileSpringOverscroll';
import theme from '../../styles/theme';

const PROFILE_SORT_OPTIONS: Array<{value: ProfileSortOption; label: string}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-comments', label: 'Most Comments'},
  {value: 'least-comments', label: 'Least Comments'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

const ProfileScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const PAGE_SIZE = 25;
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const filterButtonRef = React.useRef<TouchableOpacity | null>(null);
  const FILTER_MENU_WIDTH = 170;
  const FILTER_MENU_HEIGHT = 236;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

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

  const {
    isLoading,
    isRefreshing,
    errorMessage,
    setErrorMessage,
    isLoadingMore,
    sortBy,
    setSortBy,
    sortedPostHistory,
    handleRefresh,
    handleLoadMore,
    removePollFromHistory,
  } = useProfilePostHistory({
    username: sessionUser?.username,
    pageSize: PAGE_SIZE,
  });

  const {
    springOffset,
    handleScroll,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useProfileSpringOverscroll();

  const {
    isLoggingOut,
    isDeletingAccount,
    isLogoutPromptVisible,
    isDeletePromptVisible,
    isDeletePhraseModalVisible,
    deletePhrase,
    deletePhraseError,
    handleLogout,
    openDeletePrompt,
    closeDeletePrompt,
    proceedToDeletePhraseStep,
    closeDeletePhraseModal,
    handleDeletePhraseChange,
    handleDeleteAccount,
    openLogoutPrompt,
    closeLogoutPrompt,
  } = useProfileAccountActions({navigation, setErrorMessage});

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

  return (
    <Animated.View
      style={[
        profileStyles.animatedContainer,
        {transform: [{translateY: springOffset}]},
      ]}>
      <FlatList
        data={!isLoading && !errorMessage ? sortedPostHistory : []}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={(item, index) =>
          item.pollId ? String(item.pollId) : `${item.title}-${index}`
        }
        contentContainerStyle={profileStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        progressViewOffset={theme.spacing.xxl}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        onScroll={({nativeEvent}) => handleScroll(nativeEvent)}
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
            <View style={profileStyles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <ProfileHeader
              profileAvatar={profileAvatar}
              profileName={profileInfo.name}
              profileBio={profileInfo.bio}
              isLoggingOut={isLoggingOut}
              isDeletingAccount={isDeletingAccount}
              onRegenerateAlias={handleRegenerateAlias}
              onRegenerateProfilePicture={handleRegenerateProfilePicture}
              onOpenLogoutPrompt={openLogoutPrompt}
              onOpenDeletePrompt={openDeletePrompt}
            />

            <View style={profileStyles.historySection}>
              <View style={profileStyles.historyHeaderRow}>
                <Text style={globalStyles.sectionTitle}>Post History</Text>
                <TouchableOpacity
                  ref={filterButtonRef}
                  style={profileStyles.filterButton}
                  onPress={handleOpenFilterMenu}>
                  <View style={profileStyles.filterIconBar} />
                  <View style={profileStyles.filterIconBar} />
                  <View style={profileStyles.filterIconBar} />
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={profileStyles.statusContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null}

            {errorMessage ? (
              <Text style={globalStyles.errorText}>{errorMessage}</Text>
            ) : null}

            {!isLoading && !errorMessage && sortedPostHistory.length === 0 ? (
              <Text style={profileStyles.emptyText}>No posts yet.</Text>
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

      <ProfileFilterMenu
        visible={isFilterMenuVisible}
        options={PROFILE_SORT_OPTIONS}
        selectedValue={sortBy}
        position={filterMenuPosition}
        width={FILTER_MENU_WIDTH}
        onClose={() => setIsFilterMenuVisible(false)}
        onSelect={value => {
          setSortBy(value);
          setIsFilterMenuVisible(false);
        }}
      />

      <ProfileDeleteAccountModal
        visible={isDeletePhraseModalVisible}
        deletePhrase={deletePhrase}
        deletePhraseError={deletePhraseError}
        isDeletingAccount={isDeletingAccount}
        onClose={closeDeletePhraseModal}
        onDeletePhraseChange={handleDeletePhraseChange}
        onDeleteAccount={handleDeleteAccount}
      />
    </Animated.View>
  );
};

export default ProfileScreen;
