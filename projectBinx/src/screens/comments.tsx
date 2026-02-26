import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types/navigation';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import AmaPoll from '../components/pollTypes/amaPoll';
import ConfirmDialog from '../components/confirmDialog';
import {MoreOptionsButton} from '../components/moreOptionsButton';
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import AnonymousNameService from '../services/anonymousNameService';
import theme from '../styles/theme';
import {PollComment} from '../types/pollTypes';

interface CommentData {
  id: string;
  commentId?: number;
  parentCommentId?: number | null;
  replyToUsername?: string;
  replyToAlias?: string;
  username: string;
  authorAlias?: string;
  authorAvatarInitials?: string;
  authorAvatarColor?: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt?: string;
  isDraft?: boolean;
  likedByCurrentUser?: boolean;
  dislikedByCurrentUser?: boolean;
}

type CommentSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-replies'
  | 'least-replies'
  | 'newest'
  | 'oldest';

const COMMENT_SORT_OPTIONS: Array<{value: CommentSortOption; label: string}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-replies', label: 'Most Replies'},
  {value: 'least-replies', label: 'Least Replies'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

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
  const currentAnonymousAlias =
    SessionService.getCurrentUser()?.anonymousAlias ??
    AnonymousNameService.generateRandomAlias();
  const currentUserAvatar = AnonymousNameService.sanitizeAvatar(
    {
      initials: SessionService.getCurrentUser()?.profileAvatarInitials,
      backgroundColor: SessionService.getCurrentUser()?.profileAvatarColor,
    },
    SessionService.getCurrentUser()?.username ?? currentUsername,
    SessionService.getCurrentUser()?.displayName,
  );
  const isAmaPoll = poll.type === 'ama';
  const pollAuthorUsername = poll.user.toLowerCase();
  const isCurrentUserPollAuthor =
    currentUsername.toLowerCase() === pollAuthorUsername;

  const [comments, setComments] = useState<CommentData[]>([]);
  const [totalCommentCount, setTotalCommentCount] = useState(
    poll.commentCount ?? 0,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<
    Record<number, boolean>
  >({});
  const [
    isDiscardReplyDraftDialogVisible,
    setIsDiscardReplyDraftDialogVisible,
  ] = useState(false);
  const [pendingReplyTarget, setPendingReplyTarget] =
    useState<CommentData | null>(null);
  const [commentSortBy, setCommentSortBy] =
    useState<CommentSortOption>('newest');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const filterButtonRef = useRef<TouchableOpacity | null>(null);
  const FILTER_MENU_WIDTH = 170;
  const FILTER_MENU_HEIGHT = 236;
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
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
    parentCommentId: comment.parentCommentId,
    username: comment.authorName,
    authorAlias: comment.authorAlias,
    authorAvatarInitials: comment.authorAvatarInitials,
    authorAvatarColor: comment.authorAvatarColor,
    content: comment.content,
    likes: comment.likes,
    dislikes: comment.dislikes,
    createdAt: comment.createdAt,
    likedByCurrentUser: comment.viewerReaction === 'like',
    dislikedByCurrentUser: comment.viewerReaction === 'dislike',
  });

  const getDisplayAlias = (comment: CommentData): string =>
    comment.authorAlias && comment.authorAlias.trim().length > 0
      ? comment.authorAlias
      : AnonymousNameService.getDeterministicAlias(comment.username);

  const getDisplayAvatar = (comment: CommentData) =>
    AnonymousNameService.sanitizeAvatar(
      {
        initials: comment.authorAvatarInitials,
        backgroundColor: comment.authorAvatarColor,
      },
      comment.username,
    );

  const mergeCommentsFromServer = (
    incomingComments: CommentData[],
    append: boolean,
  ) => {
    setComments(previousComments => {
      const draftComments = previousComments.filter(comment => comment.isDraft);
      const persistedComments = previousComments.filter(
        comment => !comment.isDraft,
      );
      const persistedById = new Map(
        persistedComments.map(comment => [comment.id, comment]),
      );

      if (!append) {
        const mergedIncoming = incomingComments.map(comment => {
          const previousComment = persistedById.get(comment.id);

          if (!previousComment) {
            return comment;
          }

          return {
            ...comment,
            authorAlias: comment.authorAlias ?? previousComment.authorAlias,
            authorAvatarInitials:
              comment.authorAvatarInitials ??
              previousComment.authorAvatarInitials,
            authorAvatarColor:
              comment.authorAvatarColor ?? previousComment.authorAvatarColor,
          };
        });

        return [...draftComments, ...mergedIncoming];
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

  const repliesByParentId = useMemo(() => {
    return comments.reduce<Record<number, CommentData[]>>((acc, comment) => {
      if (
        comment.parentCommentId === null ||
        comment.parentCommentId === undefined
      ) {
        return acc;
      }

      if (!acc[comment.parentCommentId]) {
        acc[comment.parentCommentId] = [];
      }

      acc[comment.parentCommentId].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const topLevelComments = useMemo(
    () =>
      comments.filter(
        comment =>
          comment.parentCommentId === null ||
          comment.parentCommentId === undefined,
      ),
    [comments],
  );

  const getCommentCreatedTimestamp = (comment: CommentData): number => {
    if (comment.createdAt) {
      const parsedTimestamp = Date.parse(comment.createdAt);
      if (!Number.isNaN(parsedTimestamp)) {
        return parsedTimestamp;
      }
    }

    if (comment.commentId !== undefined) {
      return comment.commentId;
    }

    return 0;
  };

  const getReplyCountForSort = useCallback(
    (comment: CommentData): number => {
      if (comment.commentId === undefined) {
        return 0;
      }

      let count = 0;
      const queue: number[] = [comment.commentId];

      while (queue.length > 0) {
        const parentId = queue.shift();

        if (parentId === undefined) {
          continue;
        }

        const childComments = repliesByParentId[parentId] ?? [];
        count += childComments.length;

        childComments.forEach(childComment => {
          if (childComment.commentId !== undefined) {
            queue.push(childComment.commentId);
          }
        });
      }

      return count;
    },
    [repliesByParentId],
  );

  const sortCommentsByCurrentFilter = useCallback(
    (items: CommentData[]): CommentData[] => {
      const nextItems = [...items];

      nextItems.sort((leftComment, rightComment) => {
        if (commentSortBy === 'most-liked') {
          return rightComment.likes - leftComment.likes;
        }

        if (commentSortBy === 'most-disliked') {
          return rightComment.dislikes - leftComment.dislikes;
        }

        if (commentSortBy === 'most-replies') {
          return (
            getReplyCountForSort(rightComment) -
            getReplyCountForSort(leftComment)
          );
        }

        if (commentSortBy === 'least-replies') {
          return (
            getReplyCountForSort(leftComment) -
            getReplyCountForSort(rightComment)
          );
        }

        if (commentSortBy === 'oldest') {
          return (
            getCommentCreatedTimestamp(leftComment) -
            getCommentCreatedTimestamp(rightComment)
          );
        }

        return (
          getCommentCreatedTimestamp(rightComment) -
          getCommentCreatedTimestamp(leftComment)
        );
      });

      return nextItems;
    },
    [commentSortBy, getReplyCountForSort],
  );

  const sortedTopLevelComments = useMemo(
    () => sortCommentsByCurrentFilter(topLevelComments),
    [sortCommentsByCurrentFilter, topLevelComments],
  );

  const getTotalDescendantCount = useCallback(
    (commentId: number): number => {
      let count = 0;
      const queue: number[] = [commentId];

      while (queue.length > 0) {
        const parentId = queue.shift();

        if (parentId === undefined) {
          continue;
        }

        const childComments = repliesByParentId[parentId] ?? [];
        count += childComments.length;

        childComments.forEach(childComment => {
          if (childComment.commentId !== undefined) {
            queue.push(childComment.commentId);
          }
        });
      }

      return count;
    },
    [repliesByParentId],
  );

  const fetchCommentsPage = useCallback(
    async ({
      pageToLoad,
      append,
      isRefresh = false,
    }: {
      pageToLoad: number;
      append: boolean;
      isRefresh?: boolean;
    }) => {
      if (poll.pollId === undefined) {
        setComments([]);
        setHasMore(false);
        setIsLoadingMore(false);
        setIsInitialLoading(false);
        setIsRefreshing(false);
        setInitialLoadError(null);
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        }

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
        if (isRefresh) {
          setIsRefreshing(false);
        }
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

  const handleRefresh = () => {
    setHasMore(true);
    setPage(1);
    fetchCommentsPage({pageToLoad: 1, append: false, isRefresh: true});
  };

  const renderPoll = (item: PollData) => {
    if (item.type === 'simple') {
      return (
        <SimplePoll
          poll={item}
          commentActionMode="add"
          onAddCommentPress={handleAddComment}
          onPollDeleted={() => navigation.goBack()}
          onPollHidden={() => navigation.goBack()}
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
          onPollHidden={() => navigation.goBack()}
        />
      );
    }

    if (item.type === 'ama') {
      return (
        <AmaPoll
          poll={item}
          commentActionMode="add"
          onAddCommentPress={handleAddComment}
          onPollDeleted={() => navigation.goBack()}
          onPollHidden={() => navigation.goBack()}
        />
      );
    }

    return null;
  };

  const handleAddComment = () => {
    const newDraftComment: CommentData = {
      id: `draft-${Date.now()}`,
      parentCommentId: null,
      username: currentUsername,
      authorAlias: currentAnonymousAlias,
      authorAvatarInitials: currentUserAvatar.initials,
      authorAvatarColor: currentUserAvatar.backgroundColor,
      content: '',
      likes: 0,
      dislikes: 0,
      createdAt: new Date().toISOString(),
      isDraft: true,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    };

    setComments(previousComments => [newDraftComment, ...previousComments]);
  };

  const getThreadRootCommentId = (comment: CommentData): number | undefined => {
    if (comment.commentId === undefined) {
      return undefined;
    }

    let rootCommentId = comment.commentId;
    let parentId = comment.parentCommentId;

    while (parentId !== null && parentId !== undefined) {
      rootCommentId = parentId;

      const parentComment = comments.find(
        existingComment => existingComment.commentId === parentId,
      );

      if (!parentComment) {
        break;
      }

      parentId = parentComment.parentCommentId;
    }

    return rootCommentId;
  };

  const hasPollAuthorRepliedToThread = (rootCommentId: number) =>
    comments.some(
      comment =>
        !comment.isDraft &&
        comment.parentCommentId === rootCommentId &&
        comment.username.toLowerCase() === pollAuthorUsername,
    );

  const canReplyToComment = (comment: CommentData) => {
    if (comment.isDraft || comment.commentId === undefined) {
      return false;
    }

    if (!isAmaPoll) {
      return true;
    }

    if (isCurrentUserPollAuthor) {
      return true;
    }

    const rootCommentId = getThreadRootCommentId(comment);

    if (rootCommentId === undefined) {
      return false;
    }

    return hasPollAuthorRepliedToThread(rootCommentId);
  };

  const openReplyDraft = (parentComment: CommentData) => {
    if (!parentComment.commentId) {
      return;
    }

    const existingReplyDraft = comments.find(
      comment =>
        comment.isDraft && comment.parentCommentId === parentComment.commentId,
    );

    if (existingReplyDraft) {
      return;
    }

    const newDraftComment: CommentData = {
      id: `draft-reply-${Date.now()}`,
      parentCommentId: parentComment.commentId,
      replyToUsername: parentComment.username,
      replyToAlias: getDisplayAlias(parentComment),
      username: currentUsername,
      authorAlias: currentAnonymousAlias,
      authorAvatarInitials: currentUserAvatar.initials,
      authorAvatarColor: currentUserAvatar.backgroundColor,
      content: '',
      likes: 0,
      dislikes: 0,
      createdAt: new Date().toISOString(),
      isDraft: true,
      likedByCurrentUser: false,
      dislikedByCurrentUser: false,
    };

    const idsToExpand: number[] = [];
    let cursor: CommentData | undefined = parentComment;

    while (cursor?.commentId !== undefined) {
      idsToExpand.push(cursor.commentId);

      if (
        cursor.parentCommentId === null ||
        cursor.parentCommentId === undefined
      ) {
        break;
      }

      cursor = comments.find(
        comment => comment.commentId === cursor?.parentCommentId,
      );
    }

    setExpandedThreads(previous => {
      const next = {...previous};
      idsToExpand.forEach(id => {
        next[id] = true;
      });
      return next;
    });
    setComments(previousComments => [newDraftComment, ...previousComments]);
  };

  const handleAddReply = (parentComment: CommentData) => {
    if (!canReplyToComment(parentComment)) {
      return;
    }

    const existingReplyDraft = comments.find(
      comment =>
        comment.isDraft &&
        comment.parentCommentId !== null &&
        comment.parentCommentId !== undefined,
    );

    if (existingReplyDraft) {
      if (existingReplyDraft.parentCommentId === parentComment.commentId) {
        return;
      }

      setPendingReplyTarget(parentComment);
      setIsDiscardReplyDraftDialogVisible(true);
      return;
    }

    openReplyDraft(parentComment);
  };

  const handleConfirmDiscardReplyDraft = () => {
    if (!pendingReplyTarget) {
      setIsDiscardReplyDraftDialogVisible(false);
      return;
    }

    setComments(previousComments =>
      previousComments.filter(
        comment =>
          !(
            comment.isDraft &&
            comment.parentCommentId !== null &&
            comment.parentCommentId !== undefined
          ),
      ),
    );

    const nextReplyTarget = pendingReplyTarget;
    setPendingReplyTarget(null);
    setIsDiscardReplyDraftDialogVisible(false);
    openReplyDraft(nextReplyTarget);
  };

  const handleCancelDiscardReplyDraft = () => {
    setPendingReplyTarget(null);
    setIsDiscardReplyDraftDialogVisible(false);
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

  const collectThreadCommentIds = (rootCommentId: number): Set<string> => {
    const ids = new Set<string>();
    const queue: number[] = [rootCommentId];

    while (queue.length > 0) {
      const currentParentId = queue.shift();

      if (currentParentId === undefined) {
        continue;
      }

      const threadComments = comments.filter(
        comment => comment.parentCommentId === currentParentId,
      );

      for (const threadComment of threadComments) {
        ids.add(threadComment.id);

        if (threadComment.commentId !== undefined) {
          queue.push(threadComment.commentId);
        }
      }
    }

    return ids;
  };

  const getDescendantCommentIds = useCallback(
    (rootCommentId: number): number[] => {
      const descendantCommentIds: number[] = [];
      const queue: number[] = [rootCommentId];

      while (queue.length > 0) {
        const currentParentId = queue.shift();

        if (currentParentId === undefined) {
          continue;
        }

        const children = repliesByParentId[currentParentId] ?? [];

        children.forEach(child => {
          if (child.commentId === undefined) {
            return;
          }

          descendantCommentIds.push(child.commentId);
          queue.push(child.commentId);
        });
      }

      return descendantCommentIds;
    },
    [repliesByParentId],
  );

  const removeCommentWithReplies = (commentId: string): number => {
    const targetComment = comments.find(comment => comment.id === commentId);

    if (!targetComment) {
      return 0;
    }

    const idsToRemove = new Set<string>([commentId]);

    if (targetComment.commentId !== undefined) {
      const descendantIds = collectThreadCommentIds(targetComment.commentId);
      descendantIds.forEach(id => idsToRemove.add(id));
    }

    const removedPersistedCount = comments.reduce((count, comment) => {
      if (!idsToRemove.has(comment.id) || comment.isDraft) {
        return count;
      }

      return count + 1;
    }, 0);

    setComments(previousComments =>
      previousComments.filter(comment => !idsToRemove.has(comment.id)),
    );

    return removedPersistedCount;
  };

  const toggleThread = (parentCommentId: number) => {
    const descendantCommentIds = getDescendantCommentIds(parentCommentId);

    setExpandedThreads(previous => {
      const shouldExpand = !previous[parentCommentId];
      const next = {...previous, [parentCommentId]: shouldExpand};

      descendantCommentIds.forEach(commentId => {
        next[commentId] = shouldExpand;
      });

      return next;
    });
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
          authorAlias: draftComment.authorAlias,
          authorAvatarInitials: draftComment.authorAvatarInitials,
          authorAvatarColor: draftComment.authorAvatarColor,
          content: trimmedContent,
          parentCommentId: draftComment.parentCommentId ?? undefined,
        }),
      1,
    )
      .then(createdComment => {
        const mappedCreatedComment = mapPollCommentToUi(createdComment);

        setComments(currentComments =>
          currentComments.map(comment =>
            comment.id === commentId
              ? {
                  ...mappedCreatedComment,
                  authorAlias:
                    mappedCreatedComment.authorAlias ??
                    draftComment.authorAlias,
                  authorAvatarInitials:
                    mappedCreatedComment.authorAvatarInitials ??
                    draftComment.authorAvatarInitials,
                  authorAvatarColor:
                    mappedCreatedComment.authorAvatarColor ??
                    draftComment.authorAvatarColor,
                }
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
      const removedPersistedCount = removeCommentWithReplies(commentId);

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
          setTotalCommentCount(previousCount =>
            Math.max(0, previousCount - removedPersistedCount),
          );
          return;
        })
        .catch(() => {
          setComments(previousComments);
        });
      return;
    }

    removeCommentWithReplies(commentId);
  };

  const handleHideComment = (commentId: string) => {
    const existingComment = comments.find(comment => comment.id === commentId);

    if (!existingComment) {
      return;
    }

    const removedPersistedCount = removeCommentWithReplies(commentId);

    if (!existingComment.isDraft && removedPersistedCount > 0) {
      setTotalCommentCount(previousCount =>
        Math.max(0, previousCount - removedPersistedCount),
      );
    }
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
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{totalCommentCount} Comments</Text>
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

  const renderCommentCard = (item: CommentData, isReply = false) => {
    const isCurrentUserComment =
      item.username.toLowerCase() === currentUsername.toLowerCase();
    const parentCommentUsername =
      item.parentCommentId === null || item.parentCommentId === undefined
        ? undefined
        : comments.find(
            comment =>
              !comment.isDraft && comment.commentId === item.parentCommentId,
          );
    const canReply = canReplyToComment(item);
    const isReplyLocked = isAmaPoll && !isCurrentUserPollAuthor && !canReply;
    const isLikedByCurrentUser = Boolean(item.likedByCurrentUser);
    const isDislikedByCurrentUser = Boolean(item.dislikedByCurrentUser);
    const avatar = getDisplayAvatar(item);

    if (item.isDraft) {
      const isSaveDisabled = item.content.trim().length === 0;

      return (
        <View style={[styles.commentCard, isReply ? styles.replyCard : null]}>
          <View style={styles.commentHeaderRow}>
            <View
              style={[
                styles.avatarPlaceholder,
                {backgroundColor: avatar.backgroundColor},
              ]}>
              <Text style={styles.avatarInitialsText}>{avatar.initials}</Text>
            </View>
            <View style={styles.commentContentWrap}>
              <Text style={styles.username}>{getDisplayAlias(item)}</Text>
              {item.replyToAlias ? (
                <Text style={styles.replyingToText}>
                  Replying to {item.replyToAlias}
                </Text>
              ) : null}
              <TextInput
                style={styles.commentInput}
                value={item.content}
                onChangeText={value => handleDraftChange(item.id, value)}
                placeholder={
                  item.parentCommentId !== null &&
                  item.parentCommentId !== undefined
                    ? 'Write a reply...'
                    : 'Write a comment...'
                }
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
      <View style={[styles.commentCard, isReply ? styles.replyCard : null]}>
        <MoreOptionsButton
          itemType="comment"
          containerStyle={styles.moreButton}
          onHide={() => handleHideComment(item.id)}
          onDelete={
            isCurrentUserComment
              ? () => handleDeleteComment(item.id)
              : undefined
          }
        />

        <View style={styles.commentHeaderRow}>
          <View
            style={[
              styles.avatarPlaceholder,
              {backgroundColor: avatar.backgroundColor},
            ]}>
            <Text style={styles.avatarInitialsText}>{avatar.initials}</Text>
          </View>
          <View style={styles.commentContentWrap}>
            <Text style={styles.username}>{getDisplayAlias(item)}</Text>
            {parentCommentUsername ? (
              <Text style={styles.replyingToText}>
                Replying to {getDisplayAlias(parentCommentUsername)}
              </Text>
            ) : null}
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
            style={[
              styles.commentActionButton,
              !canReply ? styles.commentActionButtonDisabled : null,
            ]}
            disabled={!canReply}
            onPress={() => handleAddReply(item)}>
            <Text style={styles.commentActionText}>
              {isReplyLocked ? 'Reply Locked' : 'Reply'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCommentThread = (
    item: CommentData,
    depth = 0,
  ): React.ReactElement => {
    const commentId = item.commentId;
    const replies =
      commentId !== undefined
        ? sortCommentsByCurrentFilter(repliesByParentId[commentId] ?? [])
        : [];
    const hasReplies = replies.length > 0;
    const totalDescendantCount =
      commentId !== undefined ? getTotalDescendantCount(commentId) : 0;
    const isExpanded =
      commentId !== undefined ? Boolean(expandedThreads[commentId]) : false;

    return (
      <View key={item.id}>
        {renderCommentCard(item, depth > 0)}

        {hasReplies && commentId !== undefined ? (
          <TouchableOpacity
            style={[
              styles.threadToggleButton,
              depth > 0 ? styles.nestedThreadToggle : null,
            ]}
            onPress={() => toggleThread(commentId)}>
            <Text style={styles.threadToggleText}>
              {isExpanded
                ? 'Hide replies'
                : `View replies (${totalDescendantCount})`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {hasReplies && isExpanded ? (
          <View style={styles.repliesContainer}>
            {replies.map(reply => renderCommentThread(reply, depth + 1))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderComment: ListRenderItem<CommentData> = ({item}) =>
    renderCommentThread(item, 0);

  return (
    <>
      <FlatList
        data={sortedTopLevelComments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        contentContainerStyle={styles.screen}
        ListHeaderComponent={pollHeader}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
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
          isLoadingMore ||
          (isInitialLoading && sortedTopLevelComments.length === 0) ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />

      <ConfirmDialog
        visible={isDiscardReplyDraftDialogVisible}
        title="Discard current reply?"
        message="You already have a reply draft. Discard it and start a new reply here?"
        confirmLabel="Discard draft"
        onConfirm={handleConfirmDiscardReplyDraft}
        onCancel={handleCancelDiscardReplyDraft}
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
              {COMMENT_SORT_OPTIONS.map(option => {
                const isSelected = option.value === commentSortBy;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.filterOptionButton}
                    onPress={() => {
                      setCommentSortBy(option.value);
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
    </>
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
  },
  sectionTitleRow: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  commentCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  replyCard: {
    marginBottom: theme.spacing.xs,
  },
  repliesContainer: {
    marginLeft: theme.spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  threadToggleButton: {
    alignSelf: 'flex-start',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  nestedThreadToggle: {
    marginLeft: theme.spacing.lg,
  },
  threadToggleText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: theme.colors.onPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
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
  replyingToText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
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
  commentActionButtonDisabled: {
    opacity: 0.5,
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
