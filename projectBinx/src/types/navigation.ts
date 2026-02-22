import {PollData} from './pollTypes';

export type RootStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
  CreatePoll: undefined;
  Home: {createdPoll?: PollData} | undefined;
};
