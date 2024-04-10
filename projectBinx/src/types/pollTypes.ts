export type PollType = 'simple' | 'multi' | 'slider';

export interface PollData {
  pollId: number;
  user: string;
  title: string;
  type: PollType;
  allowComments: boolean;
  results: any;
  upVotes?: number;
  downVotes?: number;
  comments?: any;
}

export interface CreatePoll {
  user: string;
  title: string;
  type: PollType;
  allowComments: boolean;
  results: any;
  upVotes?: number;
  downVotes?: number;
  comments?: any;
}
