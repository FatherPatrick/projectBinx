import axios from 'axios';

const API_BASE_URL = 'https://example.com/api'; // Replace with your API base URL

export interface Credentials {
  phoneNumber: string;
  password?: string;
  deviceId: string;
}

const LoginService = {
  // Verify user
  tryLogin: async (login: Credentials) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, login);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createAcc: async (login: Credentials) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login/new`, login);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //figure out this shit
  forgotPassword: async (login: Credentials) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login/forgot`, login);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default LoginService;
