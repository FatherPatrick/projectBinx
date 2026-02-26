import {useCallback, useEffect, useMemo, useState} from 'react';
import PollService from '../../../services/pollService';
import LocationService from '../../../services/locationService';
import SessionService from '../../../services/sessionService';
import {PollData} from '../../../types/pollTypes';

export type FeedSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-comments'
  | 'least-comments'
  | 'newest'
  | 'oldest';

const PAGE_SIZE = 25;

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

const useHomePollFeed = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [polls, setPolls] = useState<PollData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<FeedSortOption>('newest');
  const currentUsername = SessionService.getCurrentUser()?.username;

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

  const withReactionCounts = useCallback(
    async (items: PollData[]): Promise<PollData[]> => {
      const itemsNeedingSummary = items.filter(
        item =>
          item.pollId !== undefined &&
          (item.likes === undefined || item.dislikes === undefined),
      );

      if (itemsNeedingSummary.length === 0) {
        return items;
      }

      const summaries = await Promise.allSettled(
        itemsNeedingSummary.map(item =>
          PollService.getPollReactionById(item.pollId!, currentUsername),
        ),
      );

      const summaryByPollId = new Map<
        number,
        {likes: number; dislikes: number}
      >();
      summaries.forEach((result, index) => {
        const pollId = itemsNeedingSummary[index].pollId;
        if (pollId === undefined || result.status !== 'fulfilled') {
          return;
        }

        summaryByPollId.set(pollId, {
          likes: result.value.likes,
          dislikes: result.value.dislikes,
        });
      });

      return items.map(item => {
        if (item.pollId === undefined) {
          return item;
        }

        const summary = summaryByPollId.get(item.pollId);
        if (!summary) {
          return {
            ...item,
            likes: item.likes ?? 0,
            dislikes: item.dislikes ?? 0,
          };
        }

        return {
          ...item,
          likes: summary.likes,
          dislikes: summary.dislikes,
        };
      });
    },
    [currentUsername],
  );

  const fetchPolls = useCallback(
    async ({
      pageToLoad,
      isRefresh = false,
    }: {
      pageToLoad: number;
      isRefresh?: boolean;
    }) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const location = await LocationService.getCurrentPositionWithPermission(
          {
            maximumAge: 60000,
          },
        );

        const fetchedPolls = await PollService.getPagedPolls({
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          viewerLatitude: location.latitude,
          viewerLongitude: location.longitude,
        });

        const hydratedPolls = await withReactionCounts(fetchedPolls);

        if (pageToLoad === 1) {
          setPolls(hydratedPolls);
        } else {
          setPolls(previousPolls =>
            mergeUniquePolls(previousPolls, hydratedPolls),
          );
        }

        setPage(pageToLoad);
        setHasMore(hydratedPolls.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        }
        setIsLoadingMore(false);
        setLoading(false);
      }
    },
    [mergeUniquePolls, withReactionCounts],
  );

  useEffect(() => {
    fetchPolls({pageToLoad: 1});
  }, [fetchPolls]);

  const handleRefresh = useCallback(() => {
    setHasMore(true);
    fetchPolls({pageToLoad: 1, isRefresh: true});
  }, [fetchPolls]);

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    fetchPolls({pageToLoad: page + 1});
  }, [fetchPolls, hasMore, isLoadingMore, loading, page, refreshing]);

  const removePollFromFeed = useCallback((poll: PollData) => {
    setPolls(previousPolls =>
      previousPolls.filter(existingPoll => {
        if (poll.pollId !== undefined && existingPoll.pollId !== undefined) {
          return existingPoll.pollId !== poll.pollId;
        }

        return !(
          existingPoll.title === poll.title && existingPoll.user === poll.user
        );
      }),
    );
  }, []);

  const prependPoll = useCallback((poll: PollData) => {
    setPolls(previousPolls => [poll, ...previousPolls]);
  }, []);

  const sortedPolls = useMemo(() => {
    const nextPolls = [...polls];

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
  }, [polls, sortBy]);

  return {
    loading,
    refreshing,
    isLoadingMore,
    sortBy,
    setSortBy,
    sortedPolls,
    removePollFromFeed,
    prependPoll,
    handleRefresh,
    handleLoadMore,
  };
};

export default useHomePollFeed;
