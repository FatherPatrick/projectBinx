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
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};
