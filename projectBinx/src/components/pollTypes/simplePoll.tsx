import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

interface SimplePollProps {
  poll: PollData;
}

//TO DO: make it so there is a yes/no, up/down, and tie each one to a selection of numbers
const SimplePoll: React.FC<SimplePollProps> = ({poll}) => {
  return (
    <TouchableOpacity onPress={() => PollService.vote(poll.pollId, 1)}>
      <View style={{padding: 10, backgroundColor: '#e0e0e0', marginBottom: 10}}>
        <Text>{poll.title}</Text>
        {/* Additional rendering logic for simple polls */}
      </View>
    </TouchableOpacity>
  );
};

export default SimplePoll;
