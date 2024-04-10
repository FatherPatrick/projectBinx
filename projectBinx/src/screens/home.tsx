import {useState, useEffect} from 'react';
import {View, Text, FlatList, ActivityIndicator} from 'react-native';
import PollService from '../services/pollService';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import MultiChoicePoll from '../components/pollTypes/multiChoicePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<PollData[]>([]);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const polls = await PollService.getPolls();
      setPolls(polls);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setLoading(false);
    }
  };

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return <SimplePoll poll={poll} />;
    } else if (poll.type === 'multi') {
      return <MultiChoicePoll poll={poll} />;
    } else if (poll.type === 'slider') {
      return <SliderPoll poll={poll} />;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{flex: 1, padding: 20}}>
      <Text style={{fontSize: 24, marginBottom: 20}}>Polls</Text>
      <FlatList
        data={polls}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={item => item.pollId.toString()}
      />
    </View>
  );
};

export default Home;
