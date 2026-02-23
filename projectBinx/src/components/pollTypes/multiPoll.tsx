import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';
import SessionService from '../../services/sessionService';
import pollStyles from '../../styles/pollStyles';
import SubmitVoteButton from '../submitVoteButton';
import theme from '../../styles/theme';

interface MultiPollProps {
  poll: PollData;
}

const MultiPoll: React.FC<MultiPollProps> = ({poll}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [votePercentages, setVotePercentages] = useState<Record<number, number>>(
    {},
  );

  const getMatchingVotesForOption = (optionIndex: number, optionVotes: Record<number, number>) => {
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
    const optionVotes = results.reduce<Record<number, number>>((acc, result) => {
      acc[result.optionId] = (acc[result.optionId] ?? 0) + result.votes;
      return acc;
    }, {});

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

  return (
    <View style={pollStyles.card}>
      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      <View style={styles.optionsContainer}>
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
              {selected === idx ? <View style={pollStyles.radioInner} /> : null}
            </View>
            <Text style={pollStyles.optionText}>{option.optionText}</Text>
            {showResults ? (
              <Text style={styles.optionPercentageText}>{getPercentageLabel(idx)}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {selected !== null ? (
        <SubmitVoteButton
          isSubmitting={isSubmitting || alreadyVoted}
          submittingLabel={alreadyVoted ? 'Already Voted' : 'Submitting...'}
          onPress={handleSubmitVote}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    alignItems: 'flex-start',
  },
  optionPercentageText: {
    marginLeft: 'auto',
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

export default MultiPoll;
