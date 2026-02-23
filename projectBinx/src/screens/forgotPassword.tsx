import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import LoginService, {Credentials} from '../services/loginService';
import globalStyles from '../styles/globalStyles';

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
    <View style={globalStyles.screenCentered}>
      <Text style={globalStyles.title}>Forgot Password</Text>
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
      {errorMessage ? (
        <Text style={globalStyles.errorText}>{errorMessage}</Text>
      ) : null}
      {successMessage ? (
        <Text style={globalStyles.successText}>{successMessage}</Text>
      ) : null}
      <Button
        title={loading ? 'Sending Request...' : 'Reset Password'}
        onPress={handleResetPassword}
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

export default ForgotPassword;
