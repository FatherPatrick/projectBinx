import axios from 'axios';
import {API_BASE_URL} from '../uri';
import {toServiceError} from './serviceError';
import {
  CreateAccountResponse,
  ForgotPasswordResponse,
  LoginResponse,
} from '../types/authTypes';

export interface Credentials {
  phoneNumber?: string;
  email?: string;
  password?: string;
  deviceId: string;
}

const LoginService = {
  // Verify user
  tryLogin: async (login: Credentials): Promise<LoginResponse> => {
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
