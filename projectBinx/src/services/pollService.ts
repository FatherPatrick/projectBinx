import axios from 'axios';
import {Polls} from '../uri';
import {PollData} from '../types/pollTypes';

const PollService = {
  // Used to fetch polls on home page and user profile
  getPagedPolls: async (params?: any) => {
    try {
      const response = await axios.get(Polls.getPagedPolls, {params});
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  //Used for editing polls
  updatePollById: async (id: number, updatedPoll: PollData) => {
    try {
      const url = Polls.updatePollById.replace(':id', String(id));
      const response = await axios.put(url, updatedPoll);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Creates a new poll
  postPoll: async (newPoll: PollData) => {
    try {
      const response = await axios.post(Polls.postPoll, newPoll);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Deletes specified poll
  deletePoll: async (id: number) => {
    try {
      const url = Polls.deletePollById.replace(':id', String(id));
      const response = await axios.delete(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Used to vote on a poll
  voteById: async (id: number, vote: any) => {
    try {
      const url = Polls.voteById.replace(':id', String(id));
      const response = await axios.post(url, vote);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Used to get results of a specific poll (should only be called after voting from FE)
  getPollResultsById: async (id: number) => {
    try {
      const url = Polls.getPollResultsById.replace(':id', String(id));
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default PollService;
