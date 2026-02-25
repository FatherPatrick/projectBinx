import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import LoginService, {Credentials} from '../services/loginService';
import DeviceInfo from 'react-native-device-info';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types/navigation';
import SessionService from '../services/sessionService';
import globalStyles from '../styles/globalStyles';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
}

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the device ID when the component mounts
    const fetchDeviceId = async () => {
      const uniqueDeviceId = await DeviceInfo.getUniqueId();
      setDeviceId(uniqueDeviceId);
    };

    fetchDeviceId();
  }, []);

  const handleLogin = async () => {
    const trimmedPhoneNumber = phoneNumber.trim();
    if (!trimmedPhoneNumber) {
      setErrorMessage('Phone number is required.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (!deviceId) {
      setErrorMessage('Device not ready yet. Please try again.');
      return;
    }

    setErrorMessage(null);
    const credentials: Credentials = {
      phoneNumber: trimmedPhoneNumber,
      password,
      deviceId,
    };

    try {
      setLoading(true);
      const loginResponse = await LoginService.tryLogin(credentials);
      await SessionService.setCurrentUserFromAuthUser(loginResponse.user);
      navigation.reset({
        index: 0,
        routes: [{name: 'MainTabs', params: {screen: 'Home'}}],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Login failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleNewAcc = () => {
    navigation.navigate('CreateAccount');
  };

  const handleUseTestAccount = () => {
    setPhoneNumber('5550001111');
    setPassword('TestPass123!');
    setErrorMessage(null);
  };

  return (
    <View style={globalStyles.screenCentered}>
      <Text style={globalStyles.title}>Login</Text>
      <TextInput
        style={[globalStyles.input, styles.input]}
        placeholder="Phone number"
        value={phoneNumber}
        keyboardType="phone-pad"
        onChangeText={text => {
          setPhoneNumber(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />
      <TextInput
        style={[globalStyles.input, styles.input]}
        placeholder="Password"
        secureTextEntry={true}
        value={password}
        onChangeText={text => {
          setPassword(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />
      <TouchableOpacity onPress={handleUseTestAccount}>
        <Text style={styles.testAccount}>Use Test Account</Text>
      </TouchableOpacity>
      {errorMessage ? (
        <Text style={globalStyles.errorText}>{errorMessage}</Text>
      ) : null}
      <Button
        title={loading ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        disabled={loading}
      />
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleNewAcc}>
        <Text style={styles.createAccount}>Create New Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
  },
  forgotPassword: {
    marginTop: 10,
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
  testAccount: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    color: '#6a1b9a',
    textDecorationLine: 'underline',
  },
  createAccount: {
    marginTop: 10,
    color: 'green',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
