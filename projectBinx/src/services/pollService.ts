import axios from 'axios';
import {CreatePoll} from '../types/pollTypes';

const API_BASE_URL = 'https://example.com/api'; // Replace with your API base URL

const PollService = {
  // Get all polls
  getPolls: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new poll
  createPoll: async (newPoll: CreatePoll) => {
    try {
      const response = await axios.post(`${API_BASE_URL}`, newPoll);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Vote for an option in a poll
  vote: async (pollId: number, vote: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/${pollId}/vote`, {
        vote,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default PollService;
