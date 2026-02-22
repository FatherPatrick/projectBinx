import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import LoginScreen from './src/screens/login';
import Home from './src/screens/home';
import {createStackNavigator} from '@react-navigation/stack';
import CreateAccount from './src/screens/createAcc';
import ForgotPassword from './src/screens/forgotPassword';
import {RootStackParamList} from './src/types/navigation';
import CreatePoll from './src/screens/createPoll';

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="CreatePoll" component={CreatePoll} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
