import {PollData} from '../../types/pollTypes';

export interface PollReactionState {
  likes: number;
  dislikes: number;
  likedByCurrentUser: boolean;
  dislikedByCurrentUser: boolean;
}

const pollReactions = new Map<string, PollReactionState>();

const getPollReactionKey = (poll: PollData): string => {
  if (poll.pollId !== undefined) {
    return `poll-${String(poll.pollId)}`;
  }

  return `${poll.user}-${poll.type}-${poll.title}`;
};

const getDefaultReactionState = (): PollReactionState => ({
  likes: 0,
  dislikes: 0,
  likedByCurrentUser: false,
  dislikedByCurrentUser: false,
});

export const getPollReactionState = (poll: PollData): PollReactionState => {
  const key = getPollReactionKey(poll);
  const existingState = pollReactions.get(key);

  if (existingState) {
    return existingState;
  }

  const defaultState = getDefaultReactionState();
  pollReactions.set(key, defaultState);
  return defaultState;
};

export const toggleLikeForPoll = (
  poll: PollData,
  currentState: PollReactionState,
): PollReactionState => {
  const key = getPollReactionKey(poll);

  const nextState: PollReactionState = currentState.likedByCurrentUser
    ? {
        ...currentState,
        likes: Math.max(0, currentState.likes - 1),
        likedByCurrentUser: false,
      }
    : {
        ...currentState,
        likes: currentState.likes + 1,
        dislikes: currentState.dislikedByCurrentUser
          ? Math.max(0, currentState.dislikes - 1)
          : currentState.dislikes,
        likedByCurrentUser: true,
        dislikedByCurrentUser: false,
      };

  pollReactions.set(key, nextState);
  return nextState;
};

export const toggleDislikeForPoll = (
  poll: PollData,
  currentState: PollReactionState,
): PollReactionState => {
  const key = getPollReactionKey(poll);

  const nextState: PollReactionState = currentState.dislikedByCurrentUser
    ? {
        ...currentState,
        dislikes: Math.max(0, currentState.dislikes - 1),
        dislikedByCurrentUser: false,
      }
    : {
        ...currentState,
        dislikes: currentState.dislikes + 1,
        likes: currentState.likedByCurrentUser
          ? Math.max(0, currentState.likes - 1)
          : currentState.likes,
        likedByCurrentUser: false,
        dislikedByCurrentUser: true,
      };

  pollReactions.set(key, nextState);
  return nextState;
};
