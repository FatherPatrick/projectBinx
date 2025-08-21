import React, {useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';

interface SimplePollProps {
  poll: PollData;
}

const SimplePoll: React.FC<SimplePollProps> = ({poll}) => {
  const [selected, setSelected] = useState<number | null>(null);

  const handleVote = (optionIndex: number) => {
    setSelected(optionIndex);
    PollService.voteById(poll.pollId!, optionIndex);
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
    <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
      {poll.options.map((option, idx) => (
        <TouchableOpacity
          key={idx}
          style={{
            flex: 1,
            marginHorizontal: 8,
            padding: 16,
            backgroundColor: selected === idx ? '#007bff' : '#fff',
            borderRadius: 8,
            borderWidth: 2,
            borderColor: selected === idx ? '#007bff' : '#ccc',
            alignItems: 'center',
          }}
          onPress={() => handleVote(idx)}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: selected === idx ? '#fff' : '#333',
            }}>
            {option.optionText}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderListOptions = () => (
    <View style={{alignItems: 'flex-start'}}>
      {poll.options.map((option, idx) => (
        <TouchableOpacity
          key={idx}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: selected === idx ? '#e3f2fd' : '#fff',
            borderRadius: 6,
            marginBottom: 8,
            width: '100%',
            borderWidth: 1,
            borderColor: selected === idx ? '#007bff' : '#ddd',
          }}
          onPress={() => handleVote(idx)}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: '#007bff',
              marginRight: 12,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: selected === idx ? '#007bff' : '#fff',
            }}>
            {selected === idx && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#fff',
                }}
              />
            )}
          </View>
          <Text style={{fontSize: 16, color: '#333'}}>{option.optionText}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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

      {isYesNo || isUpDown ? renderBinaryOptions() : renderListOptions()}
    </View>
  );
};

export default SimplePoll;
