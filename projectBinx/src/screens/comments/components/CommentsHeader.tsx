import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {PollData} from '../../../types/pollTypes';
import styles from '../../../styles/commentsStyles';
import CommentsPollPreview from './CommentsPollPreview';

interface CommentsHeaderProps {
  poll: PollData;
  totalCommentCount: number;
  filterButtonRef: React.RefObject<TouchableOpacity>;
  onOpenFilterMenu: () => void;
  onAddCommentPress: () => void;
  onPollRemoved: () => void;
}

const CommentsHeader: React.FC<CommentsHeaderProps> = ({
  poll,
  totalCommentCount,
  filterButtonRef,
  onOpenFilterMenu,
  onAddCommentPress,
  onPollRemoved,
}) => (
  <View>
    <CommentsPollPreview
      poll={poll}
      onAddCommentPress={onAddCommentPress}
      onPollRemoved={onPollRemoved}
    />
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{totalCommentCount} Comments</Text>
      <TouchableOpacity
        ref={filterButtonRef}
        style={styles.filterButton}
        onPress={onOpenFilterMenu}>
        <View style={styles.filterIconBar} />
        <View style={styles.filterIconBar} />
        <View style={styles.filterIconBar} />
      </TouchableOpacity>
    </View>
  </View>
);

export default CommentsHeader;
