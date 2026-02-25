export const API_BASE_URL = 'http://10.0.2.2:4000/api';

export const Polls = {
  getPagedPolls: `${API_BASE_URL}/poll/paged`,
  updatePollById: `${API_BASE_URL}/poll/update/:id`,
  deletePollById: `${API_BASE_URL}/poll/delete/:id`,
  postPoll: `${API_BASE_URL}/poll`,
  voteById: `${API_BASE_URL}/poll/vote/:id`,
  getPollResultsById: `${API_BASE_URL}/poll/results/:id`,
  getCommentsByPollId: `${API_BASE_URL}/poll/comments/:id`,
  createCommentByPollId: `${API_BASE_URL}/poll/comments/:id`,
  deleteCommentById: `${API_BASE_URL}/poll/comments/:pollId/:commentId`,
  getPollReactionById: `${API_BASE_URL}/poll/reaction/:id`,
  setPollReactionById: `${API_BASE_URL}/poll/reaction/:id`,
  clearPollReactionById: `${API_BASE_URL}/poll/reaction/:id`,
  getCommentReactionById: `${API_BASE_URL}/poll/comment/reaction/:commentId`,
  setCommentReactionById: `${API_BASE_URL}/poll/comment/reaction/:commentId`,
  clearCommentReactionById: `${API_BASE_URL}/poll/comment/reaction/:commentId`,
};
