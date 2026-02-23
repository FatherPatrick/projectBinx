import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import {mockPolls} from '../data/testData';
import {PollData} from '../types/pollTypes';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

const USE_MOCK_POLLS = true;

const Profile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postHistory, setPostHistory] = useState<PollData[]>([]);

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

  useEffect(() => {
    const fetchPostHistory = async () => {
      const username = sessionUser?.username;
      if (!username) {
        setPostHistory([]);
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const fetchedPolls = USE_MOCK_POLLS
          ? mockPolls
          : await PollService.getPagedPolls({user: username});

        const userPolls = fetchedPolls.filter(
          poll => poll.user.toLowerCase() === username.toLowerCase(),
        );
        setPostHistory(userPolls);
      } catch (error) {
        setErrorMessage('Unable to load post history right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostHistory();
  }, [sessionUser?.username]);

  const profileInitial = profileInfo.name.charAt(0).toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={globalStyles.screen}
      showsVerticalScrollIndicator={false}>
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

        {!isLoading && !errorMessage
          ? postHistory.map((post, index) => (
              <View
                key={
                  post.pollId ? String(post.pollId) : `${post.title}-${index}`
                }
                style={styles.postCard}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postDate}>Type: {post.type}</Text>
              </View>
            ))
          : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  postCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  postDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
