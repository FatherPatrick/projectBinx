import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

interface MultiChoicePollProps {
  poll: PollData;
}

//TO DO: update everything about this
const MultiChoicePoll: React.FC<MultiChoicePollProps> = ({poll}) => {
  return (
    <TouchableOpacity onPress={() => PollService.vote(poll.pollId, 1)}>
      <View style={{padding: 10, backgroundColor: '#e0e0e0', marginBottom: 10}}>
        <Text>{poll.title}</Text>
        {/* Additional rendering logic for multi-choice polls */}
      </View>
    </TouchableOpacity>
  );
};

export default MultiChoicePoll;
