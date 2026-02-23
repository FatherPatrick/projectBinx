import React, {useMemo, useRef, useState} from 'react';
import {PanResponder, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../types/pollTypes';
import PollService from '../../services/pollService';
import SessionService from '../../services/sessionService';
import pollStyles from '../../styles/pollStyles';
import theme from '../../styles/theme';
import SubmitVoteButton from '../submitVoteButton';

interface SliderPollProps {
  poll: PollData;
  onSlidingStateChange?: (isSliding: boolean) => void;
}

interface SliderAggregate {
  total: number;
  count: number;
}

const sliderAggregates = new Map<string, SliderAggregate>();

const getPollAggregateKey = (poll: PollData): string =>
  poll.pollId !== undefined ? String(poll.pollId) : `${poll.user}-${poll.title}`;

const SliderPoll: React.FC<SliderPollProps> = ({poll, onSlidingStateChange}) => {
  const aggregateKey = getPollAggregateKey(poll);
  const existingAggregate = sliderAggregates.get(aggregateKey);

  const initialAverage = existingAggregate
    ? existingAggregate.total / existingAggregate.count
    : 50;

  const [sliderValue, setSliderValue] = useState<number>(initialAverage);
  const [averageValue, setAverageValue] = useState<number>(initialAverage);
  const [responseCount, setResponseCount] = useState<number>(
    existingAggregate?.count ?? 0,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(1);
  const dragStartValueRef = useRef(sliderValue);
  const optionCount = poll.options.length;

  const lockParentScroll = () => {
    onSlidingStateChange?.(true);
  };

  const unlockParentScroll = () => {
    onSlidingStateChange?.(false);
  };

  const updateSliderFromLocation = (locationX: number) => {
    const clampedX = Math.max(0, Math.min(locationX, sliderTrackWidth));
    const normalizedValue = clampedX / sliderTrackWidth;
    setSliderValue(Math.round(normalizedValue * 100));
  };

  const getClampedValue = (value: number) =>
    Math.max(0, Math.min(100, Math.round(value)));

  const sliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 1,
        onPanResponderGrant: event => {
          lockParentScroll();
          dragStartValueRef.current = sliderValue;
          updateSliderFromLocation(event.nativeEvent.locationX);
        },
        onPanResponderMove: (_, gestureState) => {
          const deltaValue = (gestureState.dx / sliderTrackWidth) * 100;
          const nextValue = getClampedValue(dragStartValueRef.current + deltaValue);
          setSliderValue(nextValue);
        },
        onPanResponderRelease: () => {
          unlockParentScroll();
        },
        onPanResponderTerminate: () => {
          unlockParentScroll();
        },
      }),
    [sliderTrackWidth],
  );

  const handleSubmitVote = async () => {
    if (isSubmitting || alreadyVoted) {
      return;
    }

    const previousAverage = averageValue;
    const previousCount = responseCount;
    setVoteError(null);

    try {
      setIsSubmitting(true);

      if (poll.pollId !== undefined) {
        const voterName =
          SessionService.getCurrentUser()?.username ?? 'anonymous_user';
        await PollService.voteById(poll.pollId, {
          value: sliderValue,
          voterName,
        });
      }

      const currentAggregate = sliderAggregates.get(aggregateKey);
      const nextAggregate = {
        total: (currentAggregate?.total ?? 0) + sliderValue,
        count: (currentAggregate?.count ?? 0) + 1,
      };

      sliderAggregates.set(aggregateKey, nextAggregate);

      const nextAverage = nextAggregate.total / nextAggregate.count;
      setAverageValue(nextAverage);
      setResponseCount(nextAggregate.count);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already voted')) {
        setAlreadyVoted(true);
      }
      setAverageValue(previousAverage);
      setResponseCount(previousCount);
      setVoteError(
        error instanceof Error
          ? error.message
          : 'Unable to submit your vote. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={pollStyles.card}>
      <Text style={pollStyles.title}>{poll.title}</Text>
      {poll.description ? (
        <Text style={pollStyles.description}>{poll.description}</Text>
      ) : null}
      {voteError ? <Text style={pollStyles.errorText}>{voteError}</Text> : null}

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderValueText}>Your value: {Math.round(sliderValue)}</Text>

        <View
          style={styles.sliderGestureWrapper}
          onLayout={event => {
            const width = event.nativeEvent.layout.width;
            if (width > 0) {
              setSliderTrackWidth(width);
            }
          }}
          {...sliderPanResponder.panHandlers}>
          <View style={styles.sliderTrackBackground} />
          <View style={[styles.sliderTrackFill, {width: `${sliderValue}%`}]} />
          <View style={[styles.sliderThumb, {left: `${sliderValue}%`}]} />
        </View>

        <View style={styles.sliderLabelsRow}>
          <Text style={styles.sliderEdgeLabel}>{poll.options[0]?.optionText}</Text>
          <Text style={styles.sliderEdgeLabel}>
            {poll.options[optionCount - 1]?.optionText}
          </Text>
        </View>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.averageText}>
          Average response: {averageValue.toFixed(1)} / 100
        </Text>
        <Text style={styles.countText}>
          Responses counted: {responseCount}
        </Text>
      </View>

      <SubmitVoteButton
        isSubmitting={isSubmitting || alreadyVoted}
        submittingLabel={alreadyVoted ? 'Already Voted' : 'Submitting...'}
        onPress={handleSubmitVote}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    marginBottom: theme.spacing.md,
  },
  sliderValueText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  sliderGestureWrapper: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  sliderTrackBackground: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    width: '100%',
    position: 'absolute',
  },
  sliderTrackFill: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    position: 'absolute',
    top: 4,
    marginLeft: -10,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderEdgeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  resultsContainer: {
    marginBottom: theme.spacing.md,
  },
  averageText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  countText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});

export default SliderPoll;
