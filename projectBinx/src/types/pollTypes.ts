export type PollType = 'simple' | 'slider' | 'ama';

export interface PollQueryParams {
  page?: number;
  pageSize?: number;
  user?: string;
  type?: PollType;
}

export interface VoteRequest {
  optionId?: number;
  value?: number;
  sliderValue?: number;
  voterName?: string;
}

export interface PollData {
  pollId?: number;
  user: string;
  title: string;
  description?: string;
  type: PollType;
  allowComments: boolean;
  commentCount?: number;
  likes?: number;
  dislikes?: number;
  createdAt?: string;
  updatedAt?: string;
  options: PollOption[];
}

export interface PollOption {
  optionId?: number;
  optionTypeId?: number;
  optionText: string;
}

export type Options = PollOption;

export interface PollResult {
  pollId: number;
  optionId: number;
  votes: number;
}

export type Results = PollResult;

export type ReactionType = 'like' | 'dislike';

export interface PollReactionSummary {
  pollId: number;
  likes: number;
  dislikes: number;
  viewerReaction: ReactionType | null;
}

export interface CommentReactionSummary {
  commentId: number;
  likes: number;
  dislikes: number;
  viewerReaction: ReactionType | null;
}

export interface PollComment {
  commentId: number;
  pollId: number;
  parentCommentId: number | null;
  authorName: string;
  authorAlias?: string;
  content: string;
  likes: number;
  dislikes: number;
  viewerReaction: ReactionType | null;
  createdAt: string;
  updatedAt: string;
}
