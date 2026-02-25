import {NavigatorScreenParams} from '@react-navigation/native';
import {PollData} from './pollTypes';

export type MainTabParamList = {
  Home: {createdPoll?: PollData} | undefined;
  CreatePoll: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
  Comments: {poll: PollData};
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};
