import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

interface SliderPollProps {
  poll: PollData;
}

// Basic layout: title, description, options
const SliderPoll: React.FC<SliderPollProps> = ({poll}) => {
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
    <View style={styles.container}>
      <Text style={styles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={styles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={styles.errorText}>{voteError}</Text> : null}
      {/* Options - placeholder for now */}
      <View style={styles.optionsContainer}>
        {poll.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.optionButton,
              selected === idx
                ? styles.optionButtonSelected
                : styles.optionButtonUnselected,
              isSubmitting ? styles.optionButtonDisabled : null,
            ]}
            disabled={isSubmitting}
            onPress={() => handleVote(idx)}>
            <View
              style={[
                styles.radio,
                selected === idx
                  ? styles.radioSelected
                  : styles.radioUnselected,
              ]}
            />
            <Text style={styles.optionText}>{option.optionText}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  optionsContainer: {
    alignItems: 'flex-start',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  optionButtonSelected: {
    backgroundColor: '#cce5ff',
  },
  optionButtonUnselected: {
    backgroundColor: '#fff',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#007bff',
  },
  radioUnselected: {
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 16,
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
});

export default SliderPoll;
