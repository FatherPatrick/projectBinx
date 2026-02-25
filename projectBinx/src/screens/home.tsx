import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import PollService from '../services/pollService';
import {PollData} from '../types/pollTypes';
import SimplePoll from '../components/pollTypes/simplePoll';
import SliderPoll from '../components/pollTypes/sliderPoll';
import MultiPoll from '../components/pollTypes/multiPoll';
import {MainTabParamList} from '../types/navigation';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
  route: RouteProp<MainTabParamList, 'Home'>;
}

const Home: React.FC<Props> = ({navigation, route}) => {
  const TOP_SPRING_PULL_LIMIT = 56;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [polls, setPolls] = useState<PollData[]>([]);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const springOffset = React.useRef(new Animated.Value(0)).current;
  const touchStartYRef = React.useRef<number | null>(null);
  const isSpringDraggingRef = React.useRef(false);
  const scrollMetricsRef = React.useRef({
    offsetY: 0,
    contentHeight: 0,
    containerHeight: 0,
  });

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

  const fetchPolls = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const fetchedPolls = await PollService.getPagedPolls();
      setPolls(fetchedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPolls(true);
  };

  const removePollFromFeed = (poll: PollData) => {
    setPolls(previousPolls =>
      previousPolls.filter(existingPoll => {
        if (poll.pollId !== undefined && existingPoll.pollId !== undefined) {
          return existingPoll.pollId !== poll.pollId;
        }

        return !(
          existingPoll.title === poll.title && existingPoll.user === poll.user
        );
      }),
    );
  };

  const renderPoll = (poll: PollData) => {
    if (poll.type === 'simple') {
      return (
        <SimplePoll
          poll={poll}
          onPollDeleted={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'slider') {
      return (
        <SliderPoll
          poll={poll}
          onSlidingStateChange={isSliding => setIsSliderInteracting(isSliding)}
          onPollDeleted={() => removePollFromFeed(poll)}
        />
      );
    } else if (poll.type === 'multi') {
      return (
        <MultiPoll poll={poll} onPollDeleted={() => removePollFromFeed(poll)} />
      );
    }
    return null;
  };

  const handleTouchStart = (pageY: number) => {
    touchStartYRef.current = pageY;
  };

  const handleTouchMove = (pageY: number) => {
    if (touchStartYRef.current === null) {
      return;
    }

    const deltaY = pageY - touchStartYRef.current;
    const {offsetY, contentHeight, containerHeight} = scrollMetricsRef.current;
    const maxOffset = Math.max(contentHeight - containerHeight, 0);
    const atTop = offsetY <= 0;
    const atBottom = offsetY >= maxOffset - 1;

    if (atTop && deltaY > 0 && deltaY <= TOP_SPRING_PULL_LIMIT) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(deltaY * 0.35);
      return;
    }

    if (atTop && deltaY > TOP_SPRING_PULL_LIMIT) {
      if (isSpringDraggingRef.current) {
        springOffset.setValue(0);
        isSpringDraggingRef.current = false;
      }
      return;
    }

    if (atBottom && deltaY < 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(deltaY * 0.35);
      return;
    }

    if (isSpringDraggingRef.current) {
      springOffset.setValue(0);
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;

    if (!isSpringDraggingRef.current) {
      return;
    }

    isSpringDraggingRef.current = false;
    Animated.spring(springOffset, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
      mass: 0.8,
    }).start();
  };

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {transform: [{translateY: springOffset}]},
      ]}>
      <FlatList
        data={polls}
        renderItem={({item}) => renderPoll(item)}
        keyExtractor={item => item.pollId!.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        progressViewOffset={theme.spacing.xxl}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        onScroll={({nativeEvent}) => {
          scrollMetricsRef.current = {
            offsetY: nativeEvent.contentOffset.y,
            contentHeight: nativeEvent.contentSize.height,
            containerHeight: nativeEvent.layoutMeasurement.height,
          };
        }}
        onTouchStart={({nativeEvent}) => handleTouchStart(nativeEvent.pageY)}
        onTouchMove={({nativeEvent}) => handleTouchMove(nativeEvent.pageY)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onScrollEndDrag={handleTouchEnd}
        onMomentumScrollEnd={handleTouchEnd}
        scrollEventThrottle={16}
        scrollEnabled={!isSliderInteracting}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={globalStyles.title}>Polls</Text>}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  listContent: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    flexGrow: 1,
  },
});

export default Home;
