export const API_BASE_URL = 'http://10.0.2.2:4000/api';

export const Polls = {
  getPagedPolls: `${API_BASE_URL}/poll/paged`,
  updatePollById: `${API_BASE_URL}/poll/update/:id`,
  deletePollById: `${API_BASE_URL}/poll/delete/:id`,
  postPoll: `${API_BASE_URL}/poll`,
  voteById: `${API_BASE_URL}/poll/vote/:id`,
  getPollResultsById: `${API_BASE_URL}/poll/results/:id`,
};
