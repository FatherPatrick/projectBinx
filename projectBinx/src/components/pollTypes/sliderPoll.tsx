import React, {useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {PollData, Options} from '../../types/pollTypes';
import PollService from '../../services/pollService';

interface SliderPollProps {
  poll: PollData;
}

// Basic layout: title, description, options
const SliderPoll: React.FC<SliderPollProps> = ({poll}) => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: '#e0e0e0',
        marginBottom: 10,
        borderRadius: 8,
      }}>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 4}}>
        {poll.title}
      </Text>
      {poll.description ? (
        <Text style={{fontSize: 14, color: '#555', marginBottom: 12}}>
          {poll.description}
        </Text>
      ) : null}
      {/* Options - placeholder for now */}
      <View style={{alignItems: 'flex-start'}}>
        {poll.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              backgroundColor: selected === idx ? '#cce5ff' : '#fff',
              borderRadius: 4,
              marginBottom: 6,
            }}
            onPress={() => {
              setSelected(idx);
              PollService.voteById(poll.pollId!, idx);
            }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: '#007bff',
                marginRight: 8,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: selected === idx ? '#007bff' : '#fff',
              }}
            />
            <Text style={{fontSize: 16}}>{option.optionText}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default SliderPoll;
