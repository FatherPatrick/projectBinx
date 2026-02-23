const express = require('express');
const {
  createPoll,
  deletePollById,
  getPagedPolls,
  getPollResultsById,
  updatePollById,
  voteById,
} = require('../polls');

const router = express.Router();

/**
 * @swagger
 * /api/poll/paged:
 *   get:
 *     tags:
 *       - Polls
 *     summary: Get paged polls
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Poll list
 */
router.get('/poll/paged', async (req, res) => {
  try {
    const polls = await getPagedPolls(req.query);
    return res.status(200).json(polls);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to fetch polls right now.',
    });
  }
});

/**
 * @swagger
 * /api/poll:
 *   post:
 *     tags:
 *       - Polls
 *     summary: Create a poll
 *     responses:
 *       201:
 *         description: Created poll
 */
router.post('/poll', async (req, res) => {
  const poll = req.body;

  if (!poll?.title || !poll?.type || !Array.isArray(poll?.options)) {
    return res.status(400).json({
      message: 'title, type, and options are required.',
    });
  }

  try {
    const createdPoll = await createPoll(poll);
    return res.status(201).json(createdPoll);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to create poll right now.',
    });
  }
});

/**
 * @swagger
 * /api/poll/update/{id}:
 *   put:
 *     tags:
 *       - Polls
 *     summary: Update poll by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated poll
 *       404:
 *         description: Poll not found
 */
router.put('/poll/update/:id', async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({message: 'Invalid poll id.'});
  }

  try {
    const updatedPoll = await updatePollById(pollId, req.body);

    if (!updatedPoll) {
      return res.status(404).json({message: 'Poll not found.'});
    }

    return res.status(200).json(updatedPoll);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update poll right now.',
    });
  }
});

/**
 * @swagger
 * /api/poll/delete/{id}:
 *   delete:
 *     tags:
 *       - Polls
 *     summary: Delete poll by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Poll deleted
 *       404:
 *         description: Poll not found
 */
router.delete('/poll/delete/:id', async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({message: 'Invalid poll id.'});
  }

  try {
    const deleted = await deletePollById(pollId);

    if (!deleted) {
      return res.status(404).json({message: 'Poll not found.'});
    }

    return res.status(200).json({success: true});
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to delete poll right now.',
    });
  }
});

/**
 * @swagger
 * /api/poll/vote/{id}:
 *   post:
 *     tags:
 *       - Polls
 *     summary: Submit vote for poll
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vote submitted
 */
router.post('/poll/vote/:id', async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({message: 'Invalid poll id.'});
  }

  try {
    const vote = await voteById(pollId, req.body);

    if (!vote.success) {
      if (vote.reason === 'poll-not-found') {
        return res.status(404).json({message: 'Poll not found.'});
      }

      if (vote.reason === 'already-voted') {
        return res.status(409).json({
          message: 'You have already voted on this poll.',
        });
      }

      return res.status(400).json({message: 'Invalid vote payload.'});
    }

    return res.status(200).json({success: true});
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to submit vote right now.',
    });
  }
});

/**
 * @swagger
 * /api/poll/results/{id}:
 *   get:
 *     tags:
 *       - Polls
 *     summary: Get poll results by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Poll results
 */
router.get('/poll/results/:id', async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({message: 'Invalid poll id.'});
  }

  try {
    const results = await getPollResultsById(pollId);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to fetch poll results right now.',
    });
  }
});

module.exports = router;