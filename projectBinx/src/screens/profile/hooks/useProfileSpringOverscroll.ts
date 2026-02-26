import {useRef} from 'react';
import {Animated, NativeScrollEvent} from 'react-native';

const MAX_OVERSCROLL_MULTIPLIER = 1.6;
const OVERSCROLL_GAIN = 1.1;
const OVERSCROLL_CURVE = 1.8;

const useProfileSpringOverscroll = () => {
  const springOffset = useRef(new Animated.Value(0)).current;
  const touchStartYRef = useRef<number | null>(null);
  const isSpringDraggingRef = useRef(false);
  const scrollMetricsRef = useRef({
    offsetY: 0,
    contentHeight: 0,
    containerHeight: 0,
  });

  const handleScroll = (nativeEvent: NativeScrollEvent) => {
    scrollMetricsRef.current = {
      offsetY: nativeEvent.contentOffset.y,
      contentHeight: nativeEvent.contentSize.height,
      containerHeight: nativeEvent.layoutMeasurement.height,
    };
  };

  const handleTouchStart = (pageY: number) => {
    touchStartYRef.current = pageY;
  };

  const getRubberBandOffset = (
    dragDistance: number,
    containerHeight: number,
  ) => {
    const safeHeight = Math.max(containerHeight, 1);
    const scaledOffset =
      (dragDistance * OVERSCROLL_GAIN) /
      (1 + dragDistance / (safeHeight * OVERSCROLL_CURVE));

    return Math.min(scaledOffset, safeHeight * MAX_OVERSCROLL_MULTIPLIER);
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

    if (atTop && deltaY > 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(getRubberBandOffset(deltaY, containerHeight));
      return;
    }

    if (atBottom && deltaY < 0) {
      isSpringDraggingRef.current = true;
      springOffset.setValue(
        -getRubberBandOffset(Math.abs(deltaY), containerHeight),
      );
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

  return {
    springOffset,
    handleScroll,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

export default useProfileSpringOverscroll;
