import React, {useMemo, useRef, useState} from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {PollData} from '../../types/pollTypes';
import {RootStackParamList} from '../../types/navigation';
import PollService from '../../services/pollService';
import SessionService from '../../services/sessionService';
import pollStyles from '../../styles/pollStyles';
import theme from '../../styles/theme';
import SubmitVoteButton from '../submitVoteButton';
import {MoreOptionsButton} from '../moreOptionsButton';

interface SliderPollProps {
  poll: PollData;
  onSlidingStateChange?: (isSliding: boolean) => void;
  commentActionMode?: 'default' | 'add';
  onAddCommentPress?: () => void;
  onPollDeleted?: () => void;
}

interface SliderAggregate {
  total: number;
  count: number;
}

interface PollReactionUiState {
  likes: number;
  dislikes: number;
  likedByCurrentUser: boolean;
  dislikedByCurrentUser: boolean;
}

const sliderAggregates = new Map<string, SliderAggregate>();

const getPollAggregateKey = (poll: PollData): string =>
  poll.pollId !== undefined
    ? String(poll.pollId)
    : `${poll.user}-${poll.title}`;

const SliderPoll: React.FC<SliderPollProps> = ({
  poll,
  onSlidingStateChange,
  commentActionMode = 'default',
  onAddCommentPress,
  onPollDeleted,
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const aggregateKey = getPollAggregateKey(poll);
  const existingAggregate = sliderAggregates.get(aggregateKey);

  const initialAverage = existingAggregate
    ? existingAggregate.total / existingAggregate.count
    : 50;

  const [sliderValue, setSliderValue] = useState<number>(initialAverage);
  const [averageValue, setAverageValue] = useState<number>(initialAverage);
  const [responseCount, setResponseCount] = useState<number>(
    existingAggregate?.count ?? 0,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(1);
  const [reactionState, setReactionState] = useState<PollReactionUiState>({
    likes: 0,
    dislikes: 0,
    likedByCurrentUser: false,
    dislikedByCurrentUser: false,
  });
  const commentCount = poll.commentCount ?? 0;
  const currentUsername = SessionService.getCurrentUser()?.username;
  const isCurrentUserPoll =
    currentUsername !== undefined &&
    poll.user.toLowerCase() === currentUsername.toLowerCase();
  const dragStartValueRef = useRef(sliderValue);
  const optionCount = poll.options.length;

  React.useEffect(() => {
    const loadReactionSummary = async () => {
      if (poll.pollId === undefined) {
        return;
      }

      try {
        const summary = await PollService.getPollReactionById(
          poll.pollId,
          currentUsername,
        );

        setReactionState({
          likes: summary.likes,
          dislikes: summary.dislikes,
          likedByCurrentUser: summary.viewerReaction === 'like',
          dislikedByCurrentUser: summary.viewerReaction === 'dislike',
        });
      } catch (error) {
        setReactionState({
          likes: 0,
          dislikes: 0,
          likedByCurrentUser: false,
          dislikedByCurrentUser: false,
        });
      }
    };

    loadReactionSummary();
  }, [currentUsername, poll.pollId]);

  const applyPollReaction = (summary: {
    likes: number;
    dislikes: number;
    viewerReaction: 'like' | 'dislike' | null;
  }) => {
    setReactionState({
      likes: summary.likes,
      dislikes: summary.dislikes,
      likedByCurrentUser: summary.viewerReaction === 'like',
      dislikedByCurrentUser: summary.viewerReaction === 'dislike',
    });

    if (summary.dislikes >= 5) {
      onPollDeleted?.();
    }
  };

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

  const getOptimisticLikeState = (
    currentState: PollReactionUiState,
  ): PollReactionUiState => {
    if (currentState.likedByCurrentUser) {
      return {
        ...currentState,
        likes: Math.max(0, currentState.likes - 1),
        likedByCurrentUser: false,
      };
    }

    return {
      ...currentState,
      likes: currentState.likes + 1,
      dislikes: currentState.dislikedByCurrentUser
        ? Math.max(0, currentState.dislikes - 1)
        : currentState.dislikes,
      likedByCurrentUser: true,
      dislikedByCurrentUser: false,
    };
  };

  const getOptimisticDislikeState = (
    currentState: PollReactionUiState,
  ): PollReactionUiState => {
    if (currentState.dislikedByCurrentUser) {
      return {
        ...currentState,
        dislikes: Math.max(0, currentState.dislikes - 1),
        dislikedByCurrentUser: false,
      };
    }

    return {
      ...currentState,
      dislikes: currentState.dislikes + 1,
      likes: currentState.likedByCurrentUser
        ? Math.max(0, currentState.likes - 1)
        : currentState.likes,
      likedByCurrentUser: false,
      dislikedByCurrentUser: true,
    };
  };

  const handleLikePress = async () => {
    if (poll.pollId === undefined || !currentUsername) {
      return;
    }

    const previousState = reactionState;
    setReactionState(getOptimisticLikeState(previousState));

    try {
      const summary = reactionState.likedByCurrentUser
        ? await requestWithRetry(
            () =>
              PollService.clearPollReactionById(poll.pollId!, currentUsername),
            1,
          )
        : await requestWithRetry(
            () =>
              PollService.setPollReactionById(
                poll.pollId!,
                currentUsername,
                'like',
              ),
            1,
          );

      applyPollReaction(summary);
    } catch (error) {
      setReactionState(previousState);
    }
  };

  const handleDislikePress = async () => {
    if (poll.pollId === undefined || !currentUsername) {
      return;
    }

    const previousState = reactionState;
    setReactionState(getOptimisticDislikeState(previousState));

    try {
      const summary = reactionState.dislikedByCurrentUser
        ? await requestWithRetry(
            () =>
              PollService.clearPollReactionById(poll.pollId!, currentUsername),
            1,
          )
        : await requestWithRetry(
            () =>
              PollService.setPollReactionById(
                poll.pollId!,
                currentUsername,
                'dislike',
              ),
            1,
          );

      applyPollReaction(summary);
    } catch (error) {
      setReactionState(previousState);
    }
  };

  const sliderPanResponder = useMemo(() => {
    const updateSliderFromLocation = (locationX: number) => {
      const clampedX = Math.max(0, Math.min(locationX, sliderTrackWidth));
      const normalizedValue = clampedX / sliderTrackWidth;
      setSliderValue(Math.round(normalizedValue * 100));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 1,
      onPanResponderGrant: event => {
        onSlidingStateChange?.(true);
        dragStartValueRef.current = sliderValue;
        updateSliderFromLocation(event.nativeEvent.locationX);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaValue = (gestureState.dx / sliderTrackWidth) * 100;
        const nextValue = Math.max(
          0,
          Math.min(100, Math.round(dragStartValueRef.current + deltaValue)),
        );
        setSliderValue(nextValue);
      },
      onPanResponderRelease: () => {
        onSlidingStateChange?.(false);
      },
      onPanResponderTerminate: () => {
        onSlidingStateChange?.(false);
      },
    });
  }, [dragStartValueRef, onSlidingStateChange, sliderTrackWidth, sliderValue]);

  const handleSubmitVote = async () => {
    if (isSubmitting || alreadyVoted) {
      return;
    }

    const previousAverage = averageValue;
    const previousCount = responseCount;
    setVoteError(null);

    try {
      setIsSubmitting(true);

      if (poll.pollId !== undefined) {
        const voterName =
          SessionService.getCurrentUser()?.username ?? 'anonymous_user';
        await PollService.voteById(poll.pollId, {
          value: sliderValue,
          voterName,
        });
      }

      const currentAggregate = sliderAggregates.get(aggregateKey);
      const nextAggregate = {
        total: (currentAggregate?.total ?? 0) + sliderValue,
        count: (currentAggregate?.count ?? 0) + 1,
      };

      sliderAggregates.set(aggregateKey, nextAggregate);

      const nextAverage = nextAggregate.total / nextAggregate.count;
      setAverageValue(nextAverage);
      setResponseCount(nextAggregate.count);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already voted')) {
        setAlreadyVoted(true);
      }
      setAverageValue(previousAverage);
      setResponseCount(previousCount);
      setVoteError(
        error instanceof Error
          ? error.message
          : 'Unable to submit your vote. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={pollStyles.card}>
      {isCurrentUserPoll && onPollDeleted ? (
        <MoreOptionsButton
          itemType="poll"
          containerStyle={pollStyles.moreButton}
          onDelete={onPollDeleted}
        />
      ) : null}

      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderValueText}>
          Your value: {Math.round(sliderValue)}
        </Text>

        <View
          style={styles.sliderGestureWrapper}
          onLayout={event => {
            const width = event.nativeEvent.layout.width;
            if (width > 0) {
              setSliderTrackWidth(width);
            }
          }}
          {...sliderPanResponder.panHandlers}>
          <View style={styles.sliderTrackBackground} />
          <View style={[styles.sliderTrackFill, {width: `${sliderValue}%`}]} />
          <View style={[styles.sliderThumb, {left: `${sliderValue}%`}]} />
        </View>

        <View style={styles.sliderLabelsRow}>
          <Text style={styles.sliderEdgeLabel}>
            {poll.options[0]?.optionText}
          </Text>
          <Text style={styles.sliderEdgeLabel}>
            {poll.options[optionCount - 1]?.optionText}
          </Text>
        </View>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.averageText}>
          Average response: {averageValue.toFixed(1)} / 100
        </Text>
        <Text style={styles.countText}>Responses counted: {responseCount}</Text>
      </View>

      <SubmitVoteButton
        isSubmitting={isSubmitting || alreadyVoted}
        submittingLabel={alreadyVoted ? 'Already Voted' : 'Submitting...'}
        onPress={handleSubmitVote}
      />

      <View style={pollStyles.actionRow}>
        <TouchableOpacity
          style={[
            pollStyles.iconActionButton,
            reactionState.likedByCurrentUser
              ? pollStyles.iconActionButtonActive
              : null,
          ]}
          onPress={handleLikePress}>
          <Text style={pollStyles.commentsButtonText}>
            👍 {reactionState.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            pollStyles.iconActionButton,
            reactionState.dislikedByCurrentUser
              ? pollStyles.iconActionButtonActive
              : null,
          ]}
          onPress={handleDislikePress}>
          <Text style={pollStyles.commentsButtonText}>
            👎 {reactionState.dislikes}
          </Text>
        </TouchableOpacity>

        {poll.allowComments && commentActionMode === 'add' ? (
          <TouchableOpacity
            style={pollStyles.commentsButton}
            onPress={onAddCommentPress}>
            <Text style={pollStyles.commentsButtonText}>Add Comment</Text>
          </TouchableOpacity>
        ) : null}

        {poll.allowComments && commentActionMode === 'default' ? (
          <TouchableOpacity
            style={pollStyles.commentsButton}
            onPress={() => navigation.navigate('Comments', {poll})}>
            <Text style={pollStyles.commentsButtonText}>💬 {commentCount}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    marginBottom: theme.spacing.md,
  },
  sliderValueText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  sliderGestureWrapper: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  sliderTrackBackground: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    width: '100%',
    position: 'absolute',
  },
  sliderTrackFill: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    position: 'absolute',
    top: 4,
    marginLeft: -10,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderEdgeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  resultsContainer: {
    marginBottom: theme.spacing.md,
  },
  averageText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  countText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});

export default SliderPoll;
