import axios from 'axios';
import {API_BASE_URL} from '../uri';
import {toServiceError} from './serviceError';
import {testAuthUsers} from '../data/testData';
import {
  CreateAccountResponse,
  ForgotPasswordResponse,
  LoginResponse,
} from '../types/authTypes';

export interface Credentials {
  phoneNumber: string;
  password?: string;
  deviceId: string;
}

const PLACEHOLDER_API_BASE_URL = 'https://your-api-domain.com/api';
const USE_MOCK_AUTH = true;

const shouldUseMockAuth =
  USE_MOCK_AUTH || API_BASE_URL === PLACEHOLDER_API_BASE_URL;

const tryMockLogin = (login: Credentials): LoginResponse => {
  const trimmedPhone = login.phoneNumber.trim();
  const matchingUser = testAuthUsers.find(
    user =>
      user.phoneNumber === trimmedPhone &&
      user.password === (login.password ?? ''),
  );

  if (!matchingUser) {
    throw new Error('Invalid credentials');
  }

  return {
    success: true,
    message: 'Login successful',
    token: `mock-token-${matchingUser.id}`,
    refreshToken: `mock-refresh-${matchingUser.id}`,
    user: {
      id: matchingUser.id,
      phoneNumber: matchingUser.phoneNumber,
      displayName: matchingUser.displayName,
    },
  };
};

const LoginService = {
  // Verify user
  tryLogin: async (login: Credentials): Promise<LoginResponse> => {
    if (shouldUseMockAuth) {
      return tryMockLogin(login);
    }

    try {
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/login`,
        login,
      );
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to login right now.');
    }
  },

  createAcc: async (login: Credentials): Promise<CreateAccountResponse> => {
    try {
      const response = await axios.post<CreateAccountResponse>(
        `${API_BASE_URL}/login/new`,
        login,
      );
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to create account right now.');
    }
  },

  forgotPassword: async (
    login: Credentials,
  ): Promise<ForgotPasswordResponse> => {
    try {
      const response = await axios.post<ForgotPasswordResponse>(
        `${API_BASE_URL}/login/forgot`,
        login,
      );
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to reset password right now.');
    }
  },
};

export default LoginService;
