import {useCallback, useEffect, useMemo, useState} from 'react';
import PollService from '../../../services/pollService';
import LocationService from '../../../services/locationService';
import {PollData} from '../../../types/pollTypes';

export type ProfileSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-comments'
  | 'least-comments'
  | 'newest'
  | 'oldest';

interface UseProfilePostHistoryParams {
  username?: string;
  pageSize: number;
}

const useProfilePostHistory = ({
  username,
  pageSize,
}: UseProfilePostHistoryParams) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postHistory, setPostHistory] = useState<PollData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<ProfileSortOption>('newest');

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
          pageSize,
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
        setHasMore(userPolls.length === pageSize);
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
    [mergeUniquePolls, pageSize, username],
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

  return {
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
  };
};

export default useProfilePostHistory;
