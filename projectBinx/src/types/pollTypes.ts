export type PollType = 'simple' | 'multi' | 'slider';

export interface PollQueryParams {
  page?: number;
  pageSize?: number;
  user?: string;
  type?: PollType;
}

export interface VoteRequest {
  optionId: number;
}

export interface PollData {
  pollId?: number;
  user: string;
  title: string;
  description?: string;
  type: PollType;
  allowComments: boolean;
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
