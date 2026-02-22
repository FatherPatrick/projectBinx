import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

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
            styles.listOptionButton,
            selected === idx
              ? styles.listOptionButtonSelected
              : styles.listOptionButtonUnselected,
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
            {selected === idx && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.listOptionText}>{option.optionText}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={styles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={styles.errorText}>{voteError}</Text> : null}

      {isYesNo || isUpDown ? renderBinaryOptions() : renderListOptions()}
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
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  binaryOptionButtonUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  binaryOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  binaryOptionTextSelected: {
    color: '#fff',
  },
  binaryOptionTextUnselected: {
    color: '#333',
  },
  listOptionsContainer: {
    alignItems: 'flex-start',
  },
  listOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
  },
  listOptionButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  listOptionButtonUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
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
  listOptionText: {
    fontSize: 16,
    color: '#333',
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
});

export default SimplePoll;
