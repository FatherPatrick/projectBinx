const BASE_URL = "https://your-api-domain.com/api";

export const Polls = {
    getPagedPolls: `${BASE_URL}/poll/paged`,
    updatePollById: `${BASE_URL}/poll/update/:id`,
    deletePollById: `${BASE_URL}/poll/delete/:id`,
    postPoll: `${BASE_URL}/poll`,
    voteById: `${BASE_URL}/poll/vote/:id`,
    getPollResultsById: `${BASE_URL}/poll/results/:id`,
};