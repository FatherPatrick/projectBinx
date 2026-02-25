import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
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
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import theme from '../styles/theme';
import {PollComment} from '../types/pollTypes';

interface CommentData {
  id: string;
  commentId?: number;
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
  const PAGE_SIZE = 25;
  const {poll} = route.params;
  const currentUsername =
    SessionService.getCurrentUser()?.username ?? 'current_user';

  const [comments, setComments] = useState<CommentData[]>([]);
  const [totalCommentCount, setTotalCommentCount] = useState(
    poll.commentCount ?? 0,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const hasUserScrolledRef = useRef(false);

  const requestWithRetry = async <T,>(
    request: () => Promise<T>,
    retries = 1,
  ): Promise<T> => {
    try {
      return await request();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      return requestWithRetry(request, retries - 1);
    }
  };

  const mapPollCommentToUi = (comment: PollComment): CommentData => ({
    id: String(comment.commentId),
    commentId: comment.commentId,
    username: comment.authorName,
    content: comment.content,
    likes: comment.likes,
    dislikes: comment.dislikes,
    likedByCurrentUser: comment.viewerReaction === 'like',
    dislikedByCurrentUser: comment.viewerReaction === 'dislike',
  });

  const mergeCommentsFromServer = (
    incomingComments: CommentData[],
    append: boolean,
  ) => {
    setComments(previousComments => {
      const draftComments = previousComments.filter(comment => comment.isDraft);
      const persistedComments = previousComments.filter(
        comment => !comment.isDraft,
      );

      if (!append) {
        return [...draftComments, ...incomingComments];
      }

      const existingIds = new Set(persistedComments.map(comment => comment.id));
      const uniqueIncoming = incomingComments.filter(comment => {
        if (existingIds.has(comment.id)) {
          return false;
        }

        existingIds.add(comment.id);
        return true;
      });

      return [...draftComments, ...persistedComments, ...uniqueIncoming];
    });
  };

  const fetchCommentsPage = useCallback(
    async ({pageToLoad, append}: {pageToLoad: number; append: boolean}) => {
      if (poll.pollId === undefined) {
        setComments([]);
        setHasMore(false);
        setIsLoadingMore(false);
        setIsInitialLoading(false);
        setInitialLoadError(null);
        return;
      }

      try {
        if (!append) {
          setInitialLoadError(null);
        }

        const response = await PollService.getCommentsByPollId(
          poll.pollId,
          currentUsername,
          {
            page: pageToLoad,
            pageSize: PAGE_SIZE,
          },
        );

        const mappedComments = response.map(mapPollCommentToUi);
        mergeCommentsFromServer(mappedComments, append);
        setPage(pageToLoad);
        setHasMore(mappedComments.length === PAGE_SIZE);
      } catch (error) {
        setHasMore(false);
        if (!append) {
          setInitialLoadError('Unable to load comments right now.');
        }
        if (!append) {
          setComments(previousComments =>
            previousComments.filter(comment => comment.isDraft),
          );
        }
      } finally {
        setIsLoadingMore(false);
        setIsInitialLoading(false);
      }
    },
    [PAGE_SIZE, currentUsername, poll.pollId],
  );

  useEffect(() => {
    setTotalCommentCount(poll.commentCount ?? 0);
    setPage(1);
    setHasMore(true);
    setIsInitialLoading(true);
    hasUserScrolledRef.current = false;
    fetchCommentsPage({pageToLoad: 1, append: false});
  }, [fetchCommentsPage, poll.commentCount]);

  const handleLoadMore = () => {
    if (!hasUserScrolledRef.current) {
      return;
    }

    if (isInitialLoading || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    fetchCommentsPage({pageToLoad: page + 1, append: true});
  };

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
    const draftComment = comments.find(comment => comment.id === commentId);

    if (!draftComment) {
      return;
    }

    const trimmedContent = draftComment.content.trim();

    if (!trimmedContent) {
      return;
    }

    if (poll.pollId === undefined) {
      setComments(previousComments =>
        previousComments.map(comment => {
          if (comment.id !== commentId) {
            return comment;
          }

          return {
            ...comment,
            content: trimmedContent,
            isDraft: false,
          };
        }),
      );
      return;
    }

    const previousComments = comments;

    setComments(previousCommentsState =>
      previousCommentsState.map(comment => {
        if (comment.id !== commentId) {
          return comment;
        }

        return {
          ...comment,
          content: trimmedContent,
          isDraft: false,
        };
      }),
    );

    requestWithRetry(
      () =>
        PollService.createCommentByPollId(poll.pollId!, {
          authorName: currentUsername,
          content: trimmedContent,
        }),
      1,
    )
      .then(createdComment => {
        setComments(currentComments =>
          currentComments.map(comment =>
            comment.id === commentId
              ? mapPollCommentToUi(createdComment)
              : comment,
          ),
        );
        setTotalCommentCount(previousCount => previousCount + 1);
      })
      .catch(() => {
        setComments(previousComments);
      });
  };

  const handleCancelDraft = (commentId: string) => {
    setComments(previousComments =>
      previousComments.filter(comment => comment.id !== commentId),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    const existingComment = comments.find(comment => comment.id === commentId);

    if (!existingComment) {
      return;
    }

    if (
      poll.pollId !== undefined &&
      existingComment.commentId !== undefined &&
      !existingComment.isDraft
    ) {
      const previousComments = comments;

      setComments(previousCommentsState =>
        previousCommentsState.filter(comment => comment.id !== commentId),
      );

      requestWithRetry(
        () =>
          PollService.deleteCommentById(
            poll.pollId!,
            existingComment.commentId!,
            currentUsername,
          ),
        1,
      )
        .then(() => {
          setTotalCommentCount(previousCount => Math.max(0, previousCount - 1));
          return;
        })
        .catch(() => {
          setComments(previousComments);
        });
      return;
    }

    setComments(previousComments =>
      previousComments.filter(comment => comment.id !== commentId),
    );
  };

  const handleLikeComment = (commentId: string) => {
    const existingComment = comments.find(comment => comment.id === commentId);

    if (
      !existingComment ||
      existingComment.isDraft ||
      !existingComment.commentId
    ) {
      return;
    }

    const request = existingComment.likedByCurrentUser
      ? () =>
          PollService.clearCommentReactionById(
            existingComment.commentId!,
            currentUsername,
          )
      : () =>
          PollService.setCommentReactionById(
            existingComment.commentId!,
            currentUsername,
            'like',
          );

    const previousComments = comments;

    setComments(previousCommentsState =>
      previousCommentsState.map(comment => {
        if (comment.id !== commentId) {
          return comment;
        }

        if (comment.likedByCurrentUser) {
          return {
            ...comment,
            likes: Math.max(0, comment.likes - 1),
            likedByCurrentUser: false,
          };
        }

        return {
          ...comment,
          likes: comment.likes + 1,
          dislikes: comment.dislikedByCurrentUser
            ? Math.max(0, comment.dislikes - 1)
            : comment.dislikes,
          likedByCurrentUser: true,
          dislikedByCurrentUser: false,
        };
      }),
    );

    requestWithRetry(request, 1)
      .then(summary => {
        setComments(currentComments =>
          currentComments.map(comment =>
            comment.id !== commentId
              ? comment
              : {
                  ...comment,
                  likes: summary.likes,
                  dislikes: summary.dislikes,
                  likedByCurrentUser: summary.viewerReaction === 'like',
                  dislikedByCurrentUser: summary.viewerReaction === 'dislike',
                },
          ),
        );
      })
      .catch(() => {
        setComments(previousComments);
      });
  };

  const handleDislikeComment = (commentId: string) => {
    const existingComment = comments.find(comment => comment.id === commentId);

    if (
      !existingComment ||
      existingComment.isDraft ||
      !existingComment.commentId
    ) {
      return;
    }

    const request = existingComment.dislikedByCurrentUser
      ? () =>
          PollService.clearCommentReactionById(
            existingComment.commentId!,
            currentUsername,
          )
      : () =>
          PollService.setCommentReactionById(
            existingComment.commentId!,
            currentUsername,
            'dislike',
          );

    const previousComments = comments;

    setComments(previousCommentsState => {
      const updatedComments = previousCommentsState.map(comment => {
        if (comment.id !== commentId) {
          return comment;
        }

        if (comment.dislikedByCurrentUser) {
          return {
            ...comment,
            dislikes: Math.max(0, comment.dislikes - 1),
            dislikedByCurrentUser: false,
          };
        }

        return {
          ...comment,
          dislikes: comment.dislikes + 1,
          likes: comment.likedByCurrentUser
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

    requestWithRetry(request, 1)
      .then(summary => {
        setComments(currentComments => {
          const updatedComments = currentComments.map(comment =>
            comment.id !== commentId
              ? comment
              : {
                  ...comment,
                  likes: summary.likes,
                  dislikes: summary.dislikes,
                  likedByCurrentUser: summary.viewerReaction === 'like',
                  dislikedByCurrentUser: summary.viewerReaction === 'dislike',
                },
          );

          return updatedComments.filter(comment =>
            comment.isDraft ? true : comment.dislikes < 5,
          );
        });
      })
      .catch(() => {
        setComments(previousComments);
      });
  };

  const pollHeader = (
    <View>
      {renderPoll(poll)}
      <Text style={styles.sectionTitle}>{totalCommentCount} Comments</Text>
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
      overScrollMode="always"
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={() => {
        hasUserScrolledRef.current = true;
      }}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        !isInitialLoading ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              {initialLoadError ?? 'No comments yet.'}
            </Text>
            {initialLoadError ? (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setIsInitialLoading(true);
                  setHasMore(true);
                  fetchCommentsPage({pageToLoad: 1, append: false});
                }}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null
      }
      ListFooterComponent={
        isLoadingMore || (isInitialLoading && comments.length === 0) ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null
      }
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
  footerLoader: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  emptyStateContainer: {
    paddingVertical: theme.spacing.md,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.base,
  },
  retryButton: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});

export default Comments;
