import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../types/navigation';
import LoginService, {Credentials} from '../../services/loginService';
import globalStyles from '../../styles/globalStyles';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'CreateAccount'>;
}

const CreateAccountScreen: React.FC<Props> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
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
    const trimmedEmail = email.trim().toLowerCase();
    const hasPhone = trimmedPhoneNumber.length > 0;
    const hasEmail = trimmedEmail.length > 0;

    if ((hasPhone && hasEmail) || (!hasPhone && !hasEmail)) {
      setErrorMessage('Provide either phone number or email, but not both.');
      return;
    }

    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
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
      ...(hasPhone ? {phoneNumber: trimmedPhoneNumber} : {}),
      ...(hasEmail ? {email: trimmedEmail} : {}),
      password,
      deviceId,
    };

    try {
      setLoading(true);
      await LoginService.createAccount(credentials);
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
      <Text style={styles.orText}>OR</Text>
      <TextInput
        style={[globalStyles.input, styles.input]}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={text => {
          setEmail(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />
      <TextInput
        style={[globalStyles.input, styles.input, styles.passwordSectionStart]}
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
  passwordSectionStart: {
    marginTop: 25,
  },
  orText: {
    marginBottom: 8,
    color: '#6b7280',
    fontWeight: '600',
  },
});

export default CreateAccountScreen;
