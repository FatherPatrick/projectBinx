import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';
import pollStyles from '../../styles/pollStyles';
import theme from '../../styles/theme';

interface SimplePollProps {
  poll: PollData;
}

const SimplePoll: React.FC<SimplePollProps> = ({poll}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

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

  // Determine if it's a yes/no or up/down poll based on option text
  const isYesNo =
    poll.options.length === 2 &&
    poll.options.some(opt => opt.optionText.toLowerCase().includes('yes')) &&
    poll.options.some(opt => opt.optionText.toLowerCase().includes('no'));

  const isUpDown =
    poll.options.length === 2 &&
    poll.options.some(opt => opt.optionText.toLowerCase().includes('up')) &&
    poll.options.some(opt => opt.optionText.toLowerCase().includes('down'));

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
            isSubmitting ? styles.optionButtonDisabled : null,
          ]}
          disabled={isSubmitting}
          onPress={() => handleVote(idx)}>
          <Text
            style={[
              styles.binaryOptionText,
              selected === idx
                ? styles.binaryOptionTextSelected
                : styles.binaryOptionTextUnselected,
            ]}>
            {option.optionText}
          </Text>
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
          onPress={() => handleVote(idx)}>
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
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={pollStyles.card}>
      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      {isYesNo || isUpDown ? renderBinaryOptions() : renderListOptions()}
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
  listOptionsContainer: {
    alignItems: 'flex-start',
  },
});

export default SimplePoll;
