import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';
import pollStyles from '../../styles/pollStyles';

interface MultiPollProps {
  poll: PollData;
}

const MultiPoll: React.FC<MultiPollProps> = ({poll}) => {
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
            onPress={() => handleVote(idx)}>
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
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    alignItems: 'flex-start',
  },
});

export default MultiPoll;
