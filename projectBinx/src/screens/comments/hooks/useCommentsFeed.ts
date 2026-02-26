import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import PollService from '../../../services/pollService';
import AnonymousNameService from '../../../services/anonymousNameService';
import {PollData} from '../../../types/pollTypes';
import {CommentData, CommentSortOption, mapPollCommentToUi} from '../types';

interface UseCommentsFeedParams {
  poll: PollData;
  currentUsername: string;
  currentAnonymousAlias: string;
  currentUserAvatar: {initials: string; backgroundColor: string};
  isAmaPoll: boolean;
  pollAuthorUsername: string;
  isCurrentUserPollAuthor: boolean;
}

const PAGE_SIZE = 25;

const useCommentsFeed = ({
  poll,
  currentUsername,
  currentAnonymousAlias,
  currentUserAvatar,
  isAmaPoll,
  pollAuthorUsername,
  isCurrentUserPollAuthor,
}: UseCommentsFeedParams) => {
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
  const hasUserScrolledRef = useRef(false);

  const requestWithRetry = async <T>(
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
    [currentUsername, poll.pollId],
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

  return {
    comments,
    totalCommentCount,
    isRefreshing,
    isLoadingMore,
    isInitialLoading,
    initialLoadError,
    expandedThreads,
    isDiscardReplyDraftDialogVisible,
    commentSortBy,
    sortedTopLevelComments,
    repliesByParentId,
    hasUserScrolledRef,
    setCommentSortBy,
    setIsInitialLoading,
    setHasMore,
    fetchCommentsPage,
    getDisplayAlias,
    getDisplayAvatar,
    sortCommentsByCurrentFilter,
    getTotalDescendantCount,
    canReplyToComment,
    toggleThread,
    handleLoadMore,
    handleRefresh,
    handleAddComment,
    handleAddReply,
    handleConfirmDiscardReplyDraft,
    handleCancelDiscardReplyDraft,
    handleDraftChange,
    handleSaveDraft,
    handleCancelDraft,
    handleDeleteComment,
    handleHideComment,
    handleLikeComment,
    handleDislikeComment,
  };
};

export default useCommentsFeed;
