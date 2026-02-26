import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {PollData} from '../../types/pollTypes';
import {RootStackParamList} from '../../types/navigation';
import PollService from '../../services/pollService';
import SessionService from '../../services/sessionService';
import pollStyles from '../../styles/pollStyles';
import theme from '../../styles/theme';
import SubmitVoteButton from '../SubmitVoteButton';
import {MoreOptionsButton} from '../MoreOptionsButton';

interface SimplePollProps {
  poll: PollData;
  commentActionMode?: 'default' | 'add';
  onAddCommentPress?: () => void;
  onPollDeleted?: () => void;
  onPollHidden?: () => void;
}

interface PollReactionUiState {
  likes: number;
  dislikes: number;
  likedByCurrentUser: boolean;
  dislikedByCurrentUser: boolean;
}

const SimplePoll: React.FC<SimplePollProps> = ({
  poll,
  commentActionMode = 'default',
  onAddCommentPress,
  onPollDeleted,
  onPollHidden,
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [votePercentages, setVotePercentages] = useState<
    Record<number, number>
  >({});
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

  useEffect(() => {
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

  const getMatchingVotesForOption = (
    optionIndex: number,
    optionVotes: Record<number, number>,
  ) => {
    const pollOption = poll.options[optionIndex];
    const idCandidates = [
      pollOption.optionId,
      pollOption.optionTypeId,
      optionIndex,
      optionIndex + 1,
    ].filter((value): value is number => value !== undefined);

    return idCandidates.reduce((maxVotes, candidate) => {
      const candidateVotes = optionVotes[candidate] ?? 0;
      return Math.max(maxVotes, candidateVotes);
    }, 0);
  };

  const fetchVotePercentages = async () => {
    if (poll.pollId === undefined) {
      return;
    }

    const results = await PollService.getPollResultsById(poll.pollId);
    const optionVotes = results.reduce<Record<number, number>>(
      (acc, result) => {
        acc[result.optionId] = (acc[result.optionId] ?? 0) + result.votes;
        return acc;
      },
      {},
    );

    const votesPerOption = poll.options.map((_, index) =>
      getMatchingVotesForOption(index, optionVotes),
    );
    const totalVotes = votesPerOption.reduce((sum, votes) => sum + votes, 0);

    const nextPercentages = votesPerOption.reduce<Record<number, number>>(
      (acc, votes, index) => {
        acc[index] = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
        return acc;
      },
      {},
    );

    setVotePercentages(nextPercentages);
  };

  const getPercentageLabel = (optionIndex: number) => {
    if (!showResults) {
      return null;
    }

    const percentage = votePercentages[optionIndex] ?? 0;
    return `${Math.round(percentage)}%`;
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitting || alreadyVoted) {
      return;
    }

    setVoteError(null);
    setSelected(optionIndex);
  };

  const handleSubmitVote = async () => {
    if (isSubmitting || selected === null || alreadyVoted) {
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedOptionId = poll.options[selected]?.optionId ?? selected;
      const voterName =
        SessionService.getCurrentUser()?.username ?? 'anonymous_user';
      await PollService.voteById(poll.pollId!, {
        optionId: selectedOptionId,
        voterName,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already voted')) {
        setAlreadyVoted(true);
      }
      setVoteError(
        error instanceof Error
          ? error.message
          : 'Unable to submit your vote. Please try again.',
      );
      return;
    } finally {
      setIsSubmitting(false);
    }

    setShowResults(true);
    try {
      await fetchVotePercentages();
    } catch (error) {
      setVotePercentages({});
    }
  };

  const isTwoOptionSimple = poll.options.length === 2;

  const renderBinaryOptions = () => (
    <View style={styles.binaryOptionsContainer}>
      {poll.options.map((option, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.binaryOptionButton,
            selected === idx
              ? styles.binaryOptionButtonSelected
              : styles.binaryOptionButtonUnselected,
            isSubmitting ? pollStyles.optionButtonDisabled : null,
          ]}
          disabled={isSubmitting}
          onPress={() => handleOptionSelect(idx)}>
          <View style={styles.binaryOptionContent}>
            <Text
              style={[
                styles.binaryOptionText,
                selected === idx
                  ? styles.binaryOptionTextSelected
                  : styles.binaryOptionTextUnselected,
              ]}>
              {option.optionText}
            </Text>
            {showResults ? (
              <Text
                style={[
                  styles.binaryOptionPercentage,
                  selected === idx
                    ? styles.binaryOptionTextSelected
                    : styles.binaryOptionTextUnselected,
                ]}>
                {getPercentageLabel(idx)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderListOptions = () => (
    <View style={styles.listOptionsContainer}>
      {poll.options.map((option, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            pollStyles.optionButtonBase,
            selected === idx
              ? pollStyles.optionButtonSelected
              : pollStyles.optionButtonUnselected,
            isSubmitting ? pollStyles.optionButtonDisabled : null,
          ]}
          disabled={isSubmitting}
          onPress={() => handleOptionSelect(idx)}>
          <View
            style={[
              pollStyles.radioOuter,
              selected === idx
                ? pollStyles.radioOuterSelected
                : pollStyles.radioOuterUnselected,
            ]}>
            {selected === idx && <View style={pollStyles.radioInner} />}
          </View>
          <Text style={pollStyles.optionText}>{option.optionText}</Text>
          {showResults ? (
            <Text style={styles.optionPercentageText}>
              {getPercentageLabel(idx)}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={pollStyles.card}>
      {onPollHidden || (isCurrentUserPoll && onPollDeleted) ? (
        <MoreOptionsButton
          itemType="poll"
          containerStyle={pollStyles.moreButton}
          onDelete={isCurrentUserPoll ? onPollDeleted : undefined}
          onHide={onPollHidden}
        />
      ) : null}

      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      {isTwoOptionSimple ? renderBinaryOptions() : renderListOptions()}

      {selected !== null ? (
        <SubmitVoteButton
          isSubmitting={isSubmitting || alreadyVoted}
          submittingLabel={alreadyVoted ? 'Already Voted' : 'Submitting...'}
          onPress={handleSubmitVote}
        />
      ) : null}

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
  binaryOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  binaryOptionButton: {
    flex: 1,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'stretch',
  },
  binaryOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binaryOptionButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  binaryOptionButtonUnselected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  binaryOptionText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  binaryOptionTextSelected: {
    color: theme.colors.surface,
  },
  binaryOptionTextUnselected: {
    color: theme.colors.textPrimary,
  },
  binaryOptionPercentage: {
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  listOptionsContainer: {
    alignItems: 'flex-start',
  },
  optionPercentageText: {
    marginLeft: 'auto',
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

export default SimplePoll;
