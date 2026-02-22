import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

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
    <View style={styles.container}>
      <Text style={styles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={styles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={styles.errorText}>{voteError}</Text> : null}

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
                styles.radioOuter,
                selected === idx
                  ? styles.radioOuterSelected
                  : styles.radioOuterUnselected,
              ]}>
              {selected === idx ? <View style={styles.radioInner} /> : null}
            </View>
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
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
  optionsContainer: {
    alignItems: 'flex-start',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
  },
  optionButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  optionButtonUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    backgroundColor: '#007bff',
  },
  radioOuterUnselected: {
    backgroundColor: '#fff',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default MultiPoll;
