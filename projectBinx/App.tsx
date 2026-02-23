import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {Text} from 'react-native';
import LoginScreen from './src/screens/login';
import Home from './src/screens/home';
import {createStackNavigator} from '@react-navigation/stack';
import CreateAccount from './src/screens/createAcc';
import ForgotPassword from './src/screens/forgotPassword';
import {MainTabParamList, RootStackParamList} from './src/types/navigation';
import CreatePoll from './src/screens/createPoll';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Profile from './src/screens/profile';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color}) => {
          if (route.name === 'CreatePoll') {
            return <Text style={{fontSize: 24, color}}>+</Text>;
          }

          if (route.name === 'Home') {
            return <Text style={{fontSize: 14, color}}>Home</Text>;
          }

          return <Text style={{fontSize: 14, color}}>Profile</Text>;
        },
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

export default App;
