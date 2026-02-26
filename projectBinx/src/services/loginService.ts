import axios from 'axios';
import {API_BASE_URL} from '../uri';
import {toServiceError} from './serviceError';
import {
  CreateAccountResponse,
  DeleteAccountResponse,
  ForgotPasswordResponse,
  LoginResponse,
} from '../types/authTypes';

export interface Credentials {
  phoneNumber?: string;
  email?: string;
  password?: string;
  userId?: number | string;
  confirmationPhrase?: string;
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

  deleteAccount: async (
    payload: Pick<
      Credentials,
      'userId' | 'phoneNumber' | 'email' | 'confirmationPhrase'
    >,
  ): Promise<DeleteAccountResponse> => {
    try {
      const response = await axios.post<DeleteAccountResponse>(
        `${API_BASE_URL}/login/delete-account`,
        payload,
      );
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to delete account right now.');
    }
  },
};

export default LoginService;
