import React, {useState} from 'react';
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types/navigation';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import {MoreOptionsButton} from '../components/moreOptionsButton';
import SessionService from '../services/sessionService';
import theme from '../styles/theme';

interface CommentData {
  id: string;
  username: string;
  content: string;
  likes: number;
  dislikes: number;
  isDraft?: boolean;
  likedByCurrentUser?: boolean;
  dislikedByCurrentUser?: boolean;
}

type CommentsRouteProp = RouteProp<RootStackParamList, 'Comments'>;
type CommentsNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Comments'
>;

interface Props {
  route: CommentsRouteProp;
  navigation: CommentsNavigationProp;
}

const Comments: React.FC<Props> = ({route, navigation}) => {
  const {poll} = route.params;
  const currentUsername =
    SessionService.getCurrentUser()?.username ?? 'current_user';

  const [comments, setComments] = useState<CommentData[]>([
    {
      id: '1',
      username: 'alex_s',
      content: 'Interesting poll. I can see both sides here.',
      likes: 4,
      dislikes: 0,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    },
    {
      id: '2',
      username: 'maya_k',
      content: 'I voted already. Curious what others think too.',
      likes: 2,
      dislikes: 1,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    },
    {
      id: '3',
      username: 'john_d',
      content: 'Could use more options, but still good question.',
      likes: 1,
      dislikes: 0,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    },
  ]);

  const renderPoll = (item: PollData) => {
    if (item.type === 'simple') {
      return (
        <SimplePoll
          poll={item}
          commentActionMode="add"
          onAddCommentPress={handleAddComment}
          onPollDeleted={() => navigation.goBack()}
        />
      );
    }

    if (item.type === 'slider') {
      return (
        <SliderPoll
          poll={item}
          commentActionMode="add"
          onAddCommentPress={handleAddComment}
          onPollDeleted={() => navigation.goBack()}
        />
      );
    }

    if (item.type === 'multi') {
      return (
        <MultiPoll
          poll={item}
          commentActionMode="add"
          onAddCommentPress={handleAddComment}
          onPollDeleted={() => navigation.goBack()}
        />
      );
    }

    return null;
  };

  const handleAddComment = () => {
    const newDraftComment: CommentData = {
      id: `draft-${Date.now()}`,
      username: currentUsername,
      content: '',
      likes: 0,
      dislikes: 0,
      isDraft: true,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    };

    setComments(previousComments => [newDraftComment, ...previousComments]);
  };

  const handleDraftChange = (commentId: string, value: string) => {
    setComments(previousComments =>
      previousComments.map(comment =>
        comment.id === commentId ? {...comment, content: value} : comment,
      ),
    );
  };

  const handleSaveDraft = (commentId: string) => {
    setComments(previousComments =>
      previousComments.map(comment => {
        if (comment.id !== commentId) {
          return comment;
        }

        return {
          ...comment,
          content: comment.content.trim(),
          isDraft: false,
        };
      }),
    );
  };

  const handleCancelDraft = (commentId: string) => {
    setComments(previousComments =>
      previousComments.filter(comment => comment.id !== commentId),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(previousComments =>
      previousComments.filter(comment => comment.id !== commentId),
    );
  };

  const handleLikeComment = (commentId: string) => {
    setComments(previousComments =>
      previousComments.map(comment => {
        if (comment.id !== commentId || comment.isDraft) {
          return comment;
        }

        const currentlyLiked = Boolean(comment.likedByCurrentUser);
        const currentlyDisliked = Boolean(comment.dislikedByCurrentUser);

        if (currentlyLiked) {
          return {
            ...comment,
            likes: Math.max(0, comment.likes - 1),
            likedByCurrentUser: false,
          };
        }

        return {
          ...comment,
          likes: comment.likes + 1,
          dislikes: currentlyDisliked
            ? Math.max(0, comment.dislikes - 1)
            : comment.dislikes,
          likedByCurrentUser: true,
          dislikedByCurrentUser: false,
        };
      }),
    );
  };

  const handleDislikeComment = (commentId: string) => {
    setComments(previousComments => {
      const updatedComments = previousComments.map(comment => {
        if (comment.id !== commentId || comment.isDraft) {
          return comment;
        }

        const currentlyLiked = Boolean(comment.likedByCurrentUser);
        const currentlyDisliked = Boolean(comment.dislikedByCurrentUser);

        if (currentlyDisliked) {
          return {
            ...comment,
            dislikes: Math.max(0, comment.dislikes - 1),
            dislikedByCurrentUser: false,
          };
        }

        return {
          ...comment,
          dislikes: comment.dislikes + 1,
          likes: currentlyLiked
            ? Math.max(0, comment.likes - 1)
            : comment.likes,
          likedByCurrentUser: false,
          dislikedByCurrentUser: true,
        };
      });

      return updatedComments.filter(comment =>
        comment.isDraft ? true : comment.dislikes < 5,
      );
    });
  };

  const pollHeader = (
    <View>
      {renderPoll(poll)}
      <Text style={styles.sectionTitle}>Comments</Text>
    </View>
  );

  const renderComment: ListRenderItem<CommentData> = ({item}) => {
    const isCurrentUserComment =
      item.username.toLowerCase() === currentUsername.toLowerCase();
    const isLikedByCurrentUser = Boolean(item.likedByCurrentUser);
    const isDislikedByCurrentUser = Boolean(item.dislikedByCurrentUser);

    if (item.isDraft) {
      const isSaveDisabled = item.content.trim().length === 0;

      return (
        <View style={styles.commentCard}>
          <View style={styles.commentHeaderRow}>
            <View style={styles.avatarPlaceholder} />
            <View style={styles.commentContentWrap}>
              <Text style={styles.username}>@{item.username}</Text>
              <TextInput
                style={styles.commentInput}
                value={item.content}
                onChangeText={value => handleDraftChange(item.id, value)}
                placeholder="Write a comment..."
                multiline={true}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.draftActionsRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelDraft(item.id)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                isSaveDisabled ? styles.saveButtonDisabled : null,
              ]}
              disabled={isSaveDisabled}
              onPress={() => handleSaveDraft(item.id)}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.commentCard}>
        {isCurrentUserComment ? (
          <MoreOptionsButton
            itemType="comment"
            containerStyle={styles.moreButton}
            onDelete={() => handleDeleteComment(item.id)}
          />
        ) : null}

        <View style={styles.commentHeaderRow}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.commentContentWrap}>
            <Text style={styles.username}>@{item.username}</Text>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        </View>

        <View style={styles.commentActionsRow}>
          <TouchableOpacity
            style={[
              styles.commentActionButton,
              isLikedByCurrentUser ? styles.commentActionButtonActive : null,
            ]}
            onPress={() => handleLikeComment(item.id)}>
            <Text style={styles.commentActionText}>👍 {item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.commentActionButton,
              isDislikedByCurrentUser ? styles.commentActionButtonActive : null,
            ]}
            onPress={() => handleDislikeComment(item.id)}>
            <Text style={styles.commentActionText}>👎 {item.dislikes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.commentActionButton}
            onPress={() => {}}>
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={comments}
      keyExtractor={item => item.id}
      renderItem={renderComment}
      contentContainerStyle={styles.screen}
      ListHeaderComponent={pollHeader}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  screen: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.avatarPlaceholder,
    marginRight: theme.spacing.sm,
  },
  commentContentWrap: {
    flex: 1,
  },
  username: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  commentText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.base,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 84,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.base,
  },
  commentActionsRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftActionsRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.xs,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  commentActionButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  commentActionButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  commentActionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  moreButton: {
    position: 'absolute',
    top: 0,
    right: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    zIndex: 1,
  },
});

export default Comments;
