import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import LoginService, {Credentials} from '../services/loginService';

const ForgotPassword = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
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

  const handleResetPassword = async () => {
    const trimmedPhoneNumber = phoneNumber.trim();
    if (!trimmedPhoneNumber) {
      setErrorMessage('Phone number is required.');
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
      deviceId,
    };

    try {
      setLoading(true);
      await LoginService.forgotPassword(credentials);
      setSuccessMessage('Reset request sent. Check your messages.');
    } catch (error) {
      setErrorMessage('Unable to submit reset request right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput
        style={styles.input}
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
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      <Button
        title={loading ? 'Sending Request...' : 'Reset Password'}
        onPress={handleResetPassword}
        disabled={loading}
      />
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
  errorText: {
    width: '100%',
    color: '#b00020',
    marginBottom: 10,
  },
  successText: {
    width: '100%',
    color: '#1b5e20',
    marginBottom: 10,
  },
});

export default ForgotPassword;
