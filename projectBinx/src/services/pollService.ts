import axios from 'axios';
import {Polls} from '../uri';
import {
  PollData,
  PollQueryParams,
  PollResult,
  VoteRequest,
} from '../types/pollTypes';
import {toServiceError} from './serviceError';

const PollService = {
  // Used to fetch polls on home page and user profile
  getPagedPolls: async (params?: PollQueryParams): Promise<PollData[]> => {
    try {
      const response = await axios.get(Polls.getPagedPolls, {params});
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to fetch polls right now.');
    }
  },

  //Used for editing polls
  updatePollById: async (id: number, updatedPoll: PollData) => {
    try {
      const url = Polls.updatePollById.replace(':id', String(id));
      const response = await axios.put(url, updatedPoll);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to update poll right now.');
    }
  },

  // Creates a new poll
  postPoll: async (newPoll: PollData): Promise<PollData> => {
    try {
      const response = await axios.post<PollData>(Polls.postPoll, newPoll);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to create poll right now.');
    }
  },

  // Deletes specified poll
  deletePoll: async (id: number) => {
    try {
      const url = Polls.deletePollById.replace(':id', String(id));
      const response = await axios.delete(url);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to delete poll right now.');
    }
  },

  // Used to vote on a poll
  voteById: async (id: number, vote: number | VoteRequest) => {
    try {
      const url = Polls.voteById.replace(':id', String(id));
      const response = await axios.post(url, vote);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to submit vote right now.');
    }
  },

  // Used to get results of a specific poll (should only be called after voting from FE)
  getPollResultsById: async (id: number): Promise<PollResult[]> => {
    try {
      const url = Polls.getPollResultsById.replace(':id', String(id));
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to fetch poll results right now.');
    }
  },
};

export default PollService;
