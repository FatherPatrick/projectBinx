import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import PollService from '../services/pollService';
import {mockPolls} from '../data/testData';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import {RootStackParamList} from '../types/navigation';

const USE_MOCK_POLLS = true;

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
  route: RouteProp<RootStackParamList, 'Home'>;
}

const Home: React.FC<Props> = ({navigation, route}) => {
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<PollData[]>([]);

  useEffect(() => {
    fetchPolls();
  }, []);

  useEffect(() => {
    const createdPoll = route.params?.createdPoll;

    if (!createdPoll) {
      return;
    }

    setPolls(previousPolls => [createdPoll, ...previousPolls]);
    navigation.setParams({createdPoll: undefined});
  }, [navigation, route.params?.createdPoll]);

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
    } else if (poll.type === 'multi') {
      return <MultiPoll poll={poll} />;
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
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreatePoll')}>
        <Text style={styles.createButtonText}>Create Poll</Text>
      </TouchableOpacity>
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
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default Home;
