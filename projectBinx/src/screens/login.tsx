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

const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    // Fetch the device ID when the component mounts
    const fetchDeviceId = async () => {
      const deviceId = await DeviceInfo.getUniqueId();
      setDeviceId(deviceId);
    };

    fetchDeviceId();
  }, []);

  const handleLogin = () => {
    if (password === '') {
      //add some logic about password is empty, forgot password?
    }
    const credentials: Credentials = {
      phoneNumber,
      password,
      deviceId,
    };
    try {
      LoginService.tryLogin(credentials);
    } catch (error) {
      throw error;
    }
  };

  const handleForgotPassword = () => {
    //navigate to forgotPassword screen
  };

  const handleNewAcc = () => {
    //navigate to createAccount screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  forgotPassword: {
    marginTop: 10,
    color: 'blue',
    textDecorationLine: 'underline',
  },
  createAccount: {
    marginTop: 10,
    color: 'green',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
