import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';
import pollStyles from '../../styles/pollStyles';
import theme from '../../styles/theme';

interface SliderPollProps {
  poll: PollData;
}

// Basic layout: title, description, options
const SliderPoll: React.FC<SliderPollProps> = ({poll}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const optionCount = poll.options.length;

  const sliderIndex = selected ?? Math.floor((optionCount - 1) / 2);
  const sliderThumbLeftPercent =
    optionCount > 1 ? (sliderIndex / (optionCount - 1)) * 100 : 0;

  const handleVote = async (optionIndex: number) => {
    if (isSubmitting) {
      return;
    }

    const previousSelection = selected;
    setVoteError(null);
    setSelected(optionIndex);

    try {
      setIsSubmitting(true);
      await PollService.voteById(poll.pollId!, optionIndex);
    } catch (error) {
      setSelected(previousSelection);
      setVoteError('Unable to submit your vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={pollStyles.card}>
      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderThumb,
              {left: `${sliderThumbLeftPercent}%`},
            ]}
          />
        </View>
        <View style={styles.sliderLabelsRow}>
          <Text style={styles.sliderEdgeLabel}>{poll.options[0]?.optionText}</Text>
          <Text style={styles.sliderEdgeLabel}>
            {poll.options[optionCount - 1]?.optionText}
          </Text>
        </View>
      </View>

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
            onPress={() => handleVote(idx)}>
            <View
              style={[
                pollStyles.radioOuter,
                selected === idx
                  ? pollStyles.radioOuterSelected
                  : pollStyles.radioOuterUnselected,
              ]}
            />
            <Text style={pollStyles.optionText}>{option.optionText}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    marginBottom: theme.spacing.md,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    position: 'relative',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: -6,
    marginLeft: -9,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderEdgeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  optionsContainer: {
    alignItems: 'flex-start',
  },
});

export default SliderPoll;
