import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import LoginService, {Credentials} from '../services/loginService';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types/navigation';
import globalStyles from '../styles/globalStyles';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'CreateAccount'>;
}

const CreateAccount: React.FC<Props> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceId = async () => {
      const uniqueDeviceId = await DeviceInfo.getUniqueId();
      setDeviceId(uniqueDeviceId);
    };

    fetchDeviceId();
  }, []);

  const handleCreateAccount = async () => {
    const trimmedPhoneNumber = phoneNumber.trim();
    if (!trimmedPhoneNumber) {
      setErrorMessage('Phone number is required.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!deviceId) {
      setErrorMessage('Device not ready yet. Please try again.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const credentials: Credentials = {
      phoneNumber: trimmedPhoneNumber,
      password,
      deviceId,
    };

    try {
      setLoading(true);
      await LoginService.createAcc(credentials);
      setSuccessMessage('Account created. Returning to login...');
      navigation.navigate('Login');
    } catch (error) {
      setErrorMessage('Unable to create account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screenCentered}>
      <Text style={globalStyles.title}>Create Account</Text>
      <TextInput
        style={[globalStyles.input, styles.input]}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phoneNumber}
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
      <TextInput
        style={[globalStyles.input, styles.input]}
        placeholder="Confirm Password"
        secureTextEntry={true}
        value={confirmPassword}
        onChangeText={text => {
          setConfirmPassword(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />
      {errorMessage ? (
        <Text style={globalStyles.errorText}>{errorMessage}</Text>
      ) : null}
      {successMessage ? (
        <Text style={globalStyles.successText}>{successMessage}</Text>
      ) : null}
      <Button
        title={loading ? 'Creating Account...' : 'Create Account'}
        onPress={handleCreateAccount}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
  },
});

export default CreateAccount;
