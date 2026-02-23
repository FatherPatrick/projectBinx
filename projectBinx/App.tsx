import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import LoginScreen from './src/screens/login';
import Home from './src/screens/home';
import {createStackNavigator} from '@react-navigation/stack';
import CreateAccount from './src/screens/createAcc';
import ForgotPassword from './src/screens/forgotPassword';
import {MainTabParamList, RootStackParamList} from './src/types/navigation';
import CreatePoll from './src/screens/createPoll';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Profile from './src/screens/profile';
import theme from './src/styles/theme';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabIcon = (routeName: keyof MainTabParamList, color: string) => {
  if (routeName === 'CreatePoll') {
    return <Text style={[styles.createIcon, {color}]}>+</Text>;
  }

  if (routeName === 'Home') {
    return <Text style={[styles.tabIconLabel, {color}]}>Home</Text>;
  }

  return <Text style={[styles.tabIconLabel, {color}]}>Profile</Text>;
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color}) => renderTabIcon(route.name, color),
      })}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{tabBarLabel: 'Home', title: 'Home'}}
      />
      <Tab.Screen
        name="CreatePoll"
        component={CreatePoll}
        options={{tabBarLabel: 'Create', title: 'Create Poll'}}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{tabBarLabel: 'Profile', title: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  createIcon: {
    fontSize: theme.fontSize.xxl,
  },
  tabIconLabel: {
    fontSize: theme.fontSize.md,
  },
});

export default App;
