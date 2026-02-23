import React, {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Text, View} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import PollService from '../services/pollService';
import {mockPolls} from '../data/testData';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import {MainTabParamList} from '../types/navigation';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

const USE_MOCK_POLLS = true;

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
  route: RouteProp<MainTabParamList, 'Home'>;
}

const Home: React.FC<Props> = ({navigation, route}) => {
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<PollData[]>([]);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);

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
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
        />
      );
    } else if (poll.type === 'multi') {
      return <MultiPoll poll={poll} />;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Text style={globalStyles.title}>Polls</Text>
      <FlatList
        data={polls}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={item => item.pollId!.toString()}
        showsVerticalScrollIndicator={true}
        scrollEnabled={!isSliderInteracting}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

export default Home;
