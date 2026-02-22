import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PollService from '../services/pollService';
import {mockPolls} from '../data/testData';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';

const USE_MOCK_POLLS = true;

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<PollData[]>([]);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const fetchedPolls = USE_MOCK_POLLS
        ? mockPolls
        : await PollService.getPagedPolls();
      setPolls(fetchedPolls);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setLoading(false);
    }
  };

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return <SimplePoll poll={poll} />;
    } else if (poll.type === 'slider') {
      return <SliderPoll poll={poll} />;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Polls</Text>
      <FlatList
        data={polls}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={item => item.pollId!.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default Home;
