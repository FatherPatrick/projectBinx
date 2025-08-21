export type PollType = 'simple' | 'multi' | 'slider';

export interface PollData {
  pollId?: number;
  user: string;
  title: string;
  description?: string;
  type: PollType;
  allowComments: boolean;
  options: Options[];
}

export interface Options {
  optionTypeId?: number;
  optionText: string;
}

export interface Results {
  pollId: number;
  optionId: number;
  votes: number;
}
