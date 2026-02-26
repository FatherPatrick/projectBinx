import React from 'react';
import {PollData} from '../../../types/pollTypes';
import SimplePoll from '../../../components/pollTypes/SimplePoll';
import SliderPoll from '../../../components/pollTypes/SliderPoll';
import AmaPoll from '../../../components/pollTypes/AmaPoll';

interface HomePollItemProps {
  poll: PollData;
  onRemovePoll: (poll: PollData) => void;
  onSliderInteractingChange: (isInteracting: boolean) => void;
}

const HomePollItem: React.FC<HomePollItemProps> = ({
  poll,
  onRemovePoll,
  onSliderInteractingChange,
}) => {
  if (poll.type === 'simple') {
    return (
      <SimplePoll
        poll={poll}
        onPollDeleted={() => onRemovePoll(poll)}
        onPollHidden={() => onRemovePoll(poll)}
      />
    );
  }

  if (poll.type === 'slider') {
    return (
      <SliderPoll
        poll={poll}
        onSlidingStateChange={isSliding => onSliderInteractingChange(isSliding)}
        onPollDeleted={() => onRemovePoll(poll)}
        onPollHidden={() => onRemovePoll(poll)}
      />
    );
  }

  if (poll.type === 'ama') {
    return (
      <AmaPoll
        poll={poll}
        onPollDeleted={() => onRemovePoll(poll)}
        onPollHidden={() => onRemovePoll(poll)}
      />
    );
  }

  return null;
};

export default HomePollItem;
