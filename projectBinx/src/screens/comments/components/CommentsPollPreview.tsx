import React from 'react';
import {PollData} from '../../../types/pollTypes';
import SimplePoll from '../../../components/pollTypes/SimplePoll';
import SliderPoll from '../../../components/pollTypes/SliderPoll';
import AmaPoll from '../../../components/pollTypes/AmaPoll';

interface CommentsPollPreviewProps {
  poll: PollData;
  onAddCommentPress: () => void;
  onPollRemoved: () => void;
}

const CommentsPollPreview: React.FC<CommentsPollPreviewProps> = ({
  poll,
  onAddCommentPress,
  onPollRemoved,
}) => {
  if (poll.type === 'simple') {
    return (
      <SimplePoll
        poll={poll}
        commentActionMode="add"
        onAddCommentPress={onAddCommentPress}
        onPollDeleted={onPollRemoved}
        onPollHidden={onPollRemoved}
      />
    );
  }

  if (poll.type === 'slider') {
    return (
      <SliderPoll
        poll={poll}
        commentActionMode="add"
        onAddCommentPress={onAddCommentPress}
        onPollDeleted={onPollRemoved}
        onPollHidden={onPollRemoved}
      />
    );
  }

  if (poll.type === 'ama') {
    return (
      <AmaPoll
        poll={poll}
        commentActionMode="add"
        onAddCommentPress={onAddCommentPress}
        onPollDeleted={onPollRemoved}
        onPollHidden={onPollRemoved}
      />
    );
  }

  return null;
};

export default CommentsPollPreview;
