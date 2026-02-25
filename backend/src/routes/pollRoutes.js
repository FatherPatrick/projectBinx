const express = require("express");
const {
  createPoll,
  deletePollById,
  getPagedPolls,
  getPollResultsById,
  updatePollById,
  voteById,
} = require("../polls");
const {
  commentCreateLimiter,
  commentDeleteLimiter,
  pollCreateLimiter,
  pollDeleteLimiter,
  pollUpdateLimiter,
  pollVoteLimiter,
  reactionWriteLimiter,
} = require("../middleware/rateLimiters");
const {
  clearCommentReaction,
  clearPollReaction,
  createComment,
  deleteCommentById,
  getCommentReactionSummary,
  getCommentsByPollId,
  getPollReactionSummary,
  setCommentReaction,
  setPollReaction,
} = require("../interactions");

const router = express.Router();

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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
router.get("/poll/paged", async (req, res) => {
  try {
    const polls = await getPagedPolls(req.query);
    return res.status(200).json(polls);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch polls right now.",
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
router.post("/poll", pollCreateLimiter, async (req, res) => {
  const poll = req.body;

  if (!poll?.title || !poll?.type || !Array.isArray(poll?.options)) {
    return res.status(400).json({
      message: "title, type, and options are required.",
    });
  }

  try {
    const createdPoll = await createPoll(poll);
    return res.status(201).json(createdPoll);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to create poll right now.",
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
router.put("/poll/update/:id", pollUpdateLimiter, async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const updatedPoll = await updatePollById(pollId, req.body);

    if (!updatedPoll) {
      return res.status(404).json({ message: "Poll not found." });
    }

    return res.status(200).json(updatedPoll);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update poll right now.",
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
router.delete("/poll/delete/:id", pollDeleteLimiter, async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const deleted = await deletePollById(pollId);

    if (!deleted) {
      return res.status(404).json({ message: "Poll not found." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to delete poll right now.",
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
router.post("/poll/vote/:id", pollVoteLimiter, async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const vote = await voteById(pollId, req.body);

    if (!vote.success) {
      if (vote.reason === "poll-not-found") {
        return res.status(404).json({ message: "Poll not found." });
      }

      if (vote.reason === "already-voted") {
        return res.status(409).json({
          message: "You have already voted on this poll.",
        });
      }

      return res.status(400).json({ message: "Invalid vote payload." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to submit vote right now.",
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
router.get("/poll/results/:id", async (req, res) => {
  const pollId = Number(req.params.id);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const results = await getPollResultsById(pollId);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch poll results right now.",
    });
  }
});

router.get("/poll/comments/:id", async (req, res) => {
  const pollId = Number(req.params.id);
  const viewerName = normalizeName(req.query.viewerName);
  const page = Number(req.query.page);
  const pageSize = Number(req.query.pageSize);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const comments = await getCommentsByPollId({
      pollId,
      viewerName: viewerName || undefined,
      page: Number.isNaN(page) ? undefined : page,
      pageSize: Number.isNaN(pageSize) ? undefined : pageSize,
    });
    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch comments right now.",
    });
  }
});

router.post("/poll/comments/:id", commentCreateLimiter, async (req, res) => {
  const pollId = Number(req.params.id);
  const authorName = normalizeName(req.body.authorName);
  const content = String(req.body.content || "").trim();
  const parentCommentId =
    req.body.parentCommentId === undefined || req.body.parentCommentId === null
      ? undefined
      : Number(req.body.parentCommentId);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  if (!authorName || !content) {
    return res.status(400).json({
      message: "authorName and content are required.",
    });
  }

  if (parentCommentId !== undefined && Number.isNaN(parentCommentId)) {
    return res.status(400).json({ message: "Invalid parent comment id." });
  }

  try {
    const created = await createComment({
      pollId,
      authorName,
      content,
      parentCommentId,
    });

    if (!created.success) {
      if (created.reason === "poll-not-found") {
        return res.status(404).json({ message: "Poll not found." });
      }

      if (created.reason === "parent-comment-not-found") {
        return res.status(404).json({ message: "Parent comment not found." });
      }

      return res.status(400).json({ message: "Invalid comment payload." });
    }

    return res.status(201).json(created.comment);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to create comment right now.",
    });
  }
});

router.delete(
  "/poll/comments/:pollId/:commentId",
  commentDeleteLimiter,
  async (req, res) => {
    const pollId = Number(req.params.pollId);
    const commentId = Number(req.params.commentId);
    const actorName = normalizeName(req.body.actorName);

    if (Number.isNaN(pollId) || Number.isNaN(commentId)) {
      return res.status(400).json({ message: "Invalid id supplied." });
    }

    try {
      const deleted = await deleteCommentById({
        commentId,
        actorName: actorName || undefined,
      });

      if (!deleted.success) {
        if (deleted.reason === "comment-not-found") {
          return res.status(404).json({ message: "Comment not found." });
        }

        if (deleted.reason === "forbidden") {
          return res
            .status(403)
            .json({ message: "Not allowed to delete this comment." });
        }

        return res.status(400).json({ message: "Unable to delete comment." });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({
        message: "Unable to delete comment right now.",
      });
    }
  }
);

router.get("/poll/reaction/:id", async (req, res) => {
  const pollId = Number(req.params.id);
  const viewerName = normalizeName(req.query.viewerName);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  try {
    const summary = await getPollReactionSummary({
      pollId,
      viewerName: viewerName || undefined,
    });

    if (!summary) {
      return res.status(404).json({ message: "Poll not found." });
    }

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch poll reactions right now.",
    });
  }
});

router.post("/poll/reaction/:id", reactionWriteLimiter, async (req, res) => {
  const pollId = Number(req.params.id);
  const reactorName = normalizeName(req.body.reactorName);
  const reaction = String(req.body.reaction || "")
    .trim()
    .toLowerCase();

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  if (!reactorName) {
    return res.status(400).json({ message: "reactorName is required." });
  }

  try {
    const applied = await setPollReaction({ pollId, reactorName, reaction });

    if (!applied.success) {
      if (applied.reason === "poll-not-found") {
        return res.status(404).json({ message: "Poll not found." });
      }

      if (applied.reason === "invalid-reaction") {
        return res
          .status(400)
          .json({ message: "Reaction must be like or dislike." });
      }

      return res.status(400).json({ message: "Unable to apply reaction." });
    }

    return res.status(200).json(applied.summary);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update poll reaction right now.",
    });
  }
});

router.delete("/poll/reaction/:id", reactionWriteLimiter, async (req, res) => {
  const pollId = Number(req.params.id);
  const reactorName = normalizeName(req.body.reactorName);

  if (Number.isNaN(pollId)) {
    return res.status(400).json({ message: "Invalid poll id." });
  }

  if (!reactorName) {
    return res.status(400).json({ message: "reactorName is required." });
  }

  try {
    const cleared = await clearPollReaction({ pollId, reactorName });

    if (!cleared.success && cleared.reason === "poll-not-found") {
      return res.status(404).json({ message: "Poll not found." });
    }

    return res.status(200).json(cleared.summary);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to clear poll reaction right now.",
    });
  }
});

router.get("/poll/comment/reaction/:commentId", async (req, res) => {
  const commentId = Number(req.params.commentId);
  const viewerName = normalizeName(req.query.viewerName);

  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id." });
  }

  try {
    const summary = await getCommentReactionSummary({
      commentId,
      viewerName: viewerName || undefined,
    });

    if (!summary) {
      return res.status(404).json({ message: "Comment not found." });
    }

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch comment reactions right now.",
    });
  }
});

router.post(
  "/poll/comment/reaction/:commentId",
  reactionWriteLimiter,
  async (req, res) => {
    const commentId = Number(req.params.commentId);
    const reactorName = normalizeName(req.body.reactorName);
    const reaction = String(req.body.reaction || "")
      .trim()
      .toLowerCase();

    if (Number.isNaN(commentId)) {
      return res.status(400).json({ message: "Invalid comment id." });
    }

    if (!reactorName) {
      return res.status(400).json({ message: "reactorName is required." });
    }

    try {
      const applied = await setCommentReaction({
        commentId,
        reactorName,
        reaction,
      });

      if (!applied.success) {
        if (applied.reason === "comment-not-found") {
          return res.status(404).json({ message: "Comment not found." });
        }

        if (applied.reason === "invalid-reaction") {
          return res
            .status(400)
            .json({ message: "Reaction must be like or dislike." });
        }

        return res.status(400).json({ message: "Unable to apply reaction." });
      }

      return res.status(200).json(applied.summary);
    } catch (error) {
      return res.status(500).json({
        message: "Unable to update comment reaction right now.",
      });
    }
  }
);

router.delete(
  "/poll/comment/reaction/:commentId",
  reactionWriteLimiter,
  async (req, res) => {
    const commentId = Number(req.params.commentId);
    const reactorName = normalizeName(req.body.reactorName);

    if (Number.isNaN(commentId)) {
      return res.status(400).json({ message: "Invalid comment id." });
    }

    if (!reactorName) {
      return res.status(400).json({ message: "reactorName is required." });
    }

    try {
      const cleared = await clearCommentReaction({ commentId, reactorName });

      if (!cleared.success && cleared.reason === "comment-not-found") {
        return res.status(404).json({ message: "Comment not found." });
      }

      return res.status(200).json(cleared.summary);
    } catch (error) {
      return res.status(500).json({
        message: "Unable to clear comment reaction right now.",
      });
    }
  }
);

module.exports = router;
