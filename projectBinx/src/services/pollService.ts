import axios from 'axios';
import {Polls} from '../uri';
import {
  CommentReactionSummary,
  PollComment,
  PollData,
  PollReactionSummary,
  PollQueryParams,
  ReactionType,
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

  getCommentsByPollId: async (
    id: number,
    viewerName?: string,
    params?: {page?: number; pageSize?: number},
  ): Promise<PollComment[]> => {
    try {
      const url = Polls.getCommentsByPollId.replace(':id', String(id));
      const response = await axios.get(url, {
        params: {
          ...(viewerName ? {viewerName} : {}),
          ...(params?.page !== undefined ? {page: params.page} : {}),
          ...(params?.pageSize !== undefined
            ? {pageSize: params.pageSize}
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to fetch comments right now.');
    }
  },

  createCommentByPollId: async (
    id: number,
    payload: {
      authorName: string;
      authorAlias?: string;
      authorAvatarInitials?: string;
      authorAvatarColor?: string;
      content: string;
      parentCommentId?: number;
    },
  ): Promise<PollComment> => {
    try {
      const url = Polls.createCommentByPollId.replace(':id', String(id));
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to create comment right now.');
    }
  },

  deleteCommentById: async (
    pollId: number,
    commentId: number,
    actorName: string,
  ) => {
    try {
      const url = Polls.deleteCommentById
        .replace(':pollId', String(pollId))
        .replace(':commentId', String(commentId));
      const response = await axios.delete(url, {data: {actorName}});
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to delete comment right now.');
    }
  },

  getPollReactionById: async (
    id: number,
    viewerName?: string,
  ): Promise<PollReactionSummary> => {
    try {
      const url = Polls.getPollReactionById.replace(':id', String(id));
      const response = await axios.get(url, {
        params: viewerName ? {viewerName} : undefined,
      });
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to fetch poll reaction right now.');
    }
  },

  setPollReactionById: async (
    id: number,
    reactorName: string,
    reaction: ReactionType,
  ): Promise<PollReactionSummary> => {
    try {
      const url = Polls.setPollReactionById.replace(':id', String(id));
      const response = await axios.post(url, {reactorName, reaction});
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to update poll reaction right now.');
    }
  },

  clearPollReactionById: async (
    id: number,
    reactorName: string,
  ): Promise<PollReactionSummary> => {
    try {
      const url = Polls.clearPollReactionById.replace(':id', String(id));
      const response = await axios.delete(url, {data: {reactorName}});
      return response.data;
    } catch (error) {
      throw toServiceError(error, 'Unable to clear poll reaction right now.');
    }
  },

  getCommentReactionById: async (
    commentId: number,
    viewerName?: string,
  ): Promise<CommentReactionSummary> => {
    try {
      const url = Polls.getCommentReactionById.replace(
        ':commentId',
        String(commentId),
      );
      const response = await axios.get(url, {
        params: viewerName ? {viewerName} : undefined,
      });
      return response.data;
    } catch (error) {
      throw toServiceError(
        error,
        'Unable to fetch comment reaction right now.',
      );
    }
  },

  setCommentReactionById: async (
    commentId: number,
    reactorName: string,
    reaction: ReactionType,
  ): Promise<CommentReactionSummary> => {
    try {
      const url = Polls.setCommentReactionById.replace(
        ':commentId',
        String(commentId),
      );
      const response = await axios.post(url, {reactorName, reaction});
      return response.data;
    } catch (error) {
      throw toServiceError(
        error,
        'Unable to update comment reaction right now.',
      );
    }
  },

  clearCommentReactionById: async (
    commentId: number,
    reactorName: string,
  ): Promise<CommentReactionSummary> => {
    try {
      const url = Polls.clearCommentReactionById.replace(
        ':commentId',
        String(commentId),
      );
      const response = await axios.delete(url, {data: {reactorName}});
      return response.data;
    } catch (error) {
      throw toServiceError(
        error,
        'Unable to clear comment reaction right now.',
      );
    }
  },
};

export default PollService;
