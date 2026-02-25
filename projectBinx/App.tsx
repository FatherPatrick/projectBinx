import {NavigationContainer} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LoginScreen from './src/screens/login';
import Home from './src/screens/home';
import {createStackNavigator} from '@react-navigation/stack';
import CreateAccount from './src/screens/createAcc';
import ForgotPassword from './src/screens/forgotPassword';
import {MainTabParamList, RootStackParamList} from './src/types/navigation';
import CreatePoll from './src/screens/createPoll';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Profile from './src/screens/profile';
import Comments from './src/screens/comments';
import SessionService from './src/services/sessionService';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabIcon = (
  routeName: keyof MainTabParamList,
  color: string,
  size: number,
  focused: boolean,
) => {
  if (routeName === 'CreatePoll') {
    return (
      <Ionicons
        name={focused ? 'add-circle' : 'add-circle-outline'}
        color={color}
        size={size + 2}
      />
    );
  }

  if (routeName === 'Home') {
    return (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        color={color}
        size={size}
      />
    );
  }

  return (
    <Ionicons
      name={focused ? 'person' : 'person-outline'}
      color={color}
      size={size}
    />
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({color, size, focused}) =>
          renderTabIcon(route.name, color, size, focused),
      })}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{tabBarLabel: 'Home', title: 'Home'}}
      />
      <Tab.Screen
        name="CreatePoll"
        component={CreatePoll}
        options={{tabBarLabel: () => null, title: 'Create Poll'}}
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
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const restoredSession = await SessionService.restoreSession();
      setIsAuthenticated(Boolean(restoredSession));
      setSessionReady(true);
    };

    initializeSession();
  }, []);

  if (!sessionReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="Comments" component={Comments} />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
});

export default App;
