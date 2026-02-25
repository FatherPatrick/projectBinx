const { pool } = require("./db");

const reactionToValue = (reaction) => {
  if (reaction === "like") {
    return 1;
  }

  if (reaction === "dislike") {
    return -1;
  }

  return null;
};

const mapCommentRow = (row) => ({
  commentId: row.id,
  pollId: row.poll_id,
  parentCommentId: row.parent_comment_id,
  authorName: row.author_name,
  content: row.content,
  likes: row.likes,
  dislikes: row.dislikes,
  viewerReaction:
    row.viewer_reaction === 1
      ? "like"
      : row.viewer_reaction === -1
      ? "dislike"
      : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensurePollExists = async (pollId) => {
  const poll = await pool.query("SELECT id FROM polls WHERE id = $1", [pollId]);
  return poll.rowCount > 0;
};

const ensureCommentExists = async (commentId) => {
  const comment = await pool.query(
    "SELECT id FROM poll_comments WHERE id = $1",
    [commentId]
  );
  return comment.rowCount > 0;
};

const createComment = async ({
  pollId,
  authorName,
  content,
  parentCommentId,
}) => {
  if (!(await ensurePollExists(pollId))) {
    return { success: false, reason: "poll-not-found" };
  }

  if (parentCommentId !== undefined && parentCommentId !== null) {
    const parentComment = await pool.query(
      "SELECT id FROM poll_comments WHERE id = $1 AND poll_id = $2",
      [parentCommentId, pollId]
    );

    if (parentComment.rowCount === 0) {
      return { success: false, reason: "parent-comment-not-found" };
    }
  }

  const createdComment = await pool.query(
    `INSERT INTO poll_comments (poll_id, author_name, content, parent_comment_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, poll_id, parent_comment_id, author_name, content, created_at, updated_at`,
    [pollId, authorName, content, parentCommentId ?? null]
  );

  const row = createdComment.rows[0];
  return {
    success: true,
    comment: {
      commentId: row.id,
      pollId: row.poll_id,
      parentCommentId: row.parent_comment_id,
      authorName: row.author_name,
      content: row.content,
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
};

const getCommentsByPollId = async ({
  pollId,
  viewerName,
  page = 1,
  pageSize = 25,
}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
  const offset = (safePage - 1) * safePageSize;

  const rows = await pool.query(
    `SELECT c.id,
            c.poll_id,
            c.parent_comment_id,
            c.author_name,
            c.content,
            c.created_at,
            c.updated_at,
            COALESCE(SUM(CASE WHEN cr.reaction = 1 THEN 1 ELSE 0 END), 0)::int AS likes,
            COALESCE(SUM(CASE WHEN cr.reaction = -1 THEN 1 ELSE 0 END), 0)::int AS dislikes,
            MAX(CASE WHEN cr.reactor_name = $2 THEN cr.reaction END)::int AS viewer_reaction
     FROM poll_comments c
     LEFT JOIN comment_reactions cr ON cr.comment_id = c.id
     WHERE c.poll_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT $3
     OFFSET $4`,
    [pollId, viewerName ?? null, safePageSize, offset]
  );

  return rows.rows.map(mapCommentRow);
};

const deleteCommentById = async ({ commentId, actorName }) => {
  if (actorName) {
    const existingComment = await pool.query(
      "SELECT author_name FROM poll_comments WHERE id = $1",
      [commentId]
    );

    if (existingComment.rowCount === 0) {
      return { success: false, reason: "comment-not-found" };
    }

    if (existingComment.rows[0].author_name !== actorName) {
      return { success: false, reason: "forbidden" };
    }
  }

  const deleted = await pool.query(
    "DELETE FROM poll_comments WHERE id = $1 RETURNING id",
    [commentId]
  );

  if (deleted.rowCount === 0) {
    return { success: false, reason: "comment-not-found" };
  }

  return { success: true };
};

const getPollReactionSummary = async ({ pollId, viewerName }) => {
  if (!(await ensurePollExists(pollId))) {
    return null;
  }

  const summary = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END), 0)::int AS likes,
            COALESCE(SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END), 0)::int AS dislikes,
            MAX(CASE WHEN reactor_name = $2 THEN reaction END)::int AS viewer_reaction
     FROM poll_reactions
     WHERE poll_id = $1`,
    [pollId, viewerName ?? null]
  );

  const row = summary.rows[0];
  return {
    pollId,
    likes: row.likes,
    dislikes: row.dislikes,
    viewerReaction:
      row.viewer_reaction === 1
        ? "like"
        : row.viewer_reaction === -1
        ? "dislike"
        : null,
  };
};

const setPollReaction = async ({ pollId, reactorName, reaction }) => {
  const reactionValue = reactionToValue(reaction);

  if (reactionValue === null) {
    return { success: false, reason: "invalid-reaction" };
  }

  if (!(await ensurePollExists(pollId))) {
    return { success: false, reason: "poll-not-found" };
  }

  await pool.query(
    `INSERT INTO poll_reactions (poll_id, reactor_name, reaction)
     VALUES ($1, $2, $3)
     ON CONFLICT (poll_id, reactor_name)
     DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()`,
    [pollId, reactorName, reactionValue]
  );

  const summary = await getPollReactionSummary({
    pollId,
    viewerName: reactorName,
  });
  return { success: true, summary };
};

const clearPollReaction = async ({ pollId, reactorName }) => {
  if (!(await ensurePollExists(pollId))) {
    return { success: false, reason: "poll-not-found" };
  }

  await pool.query(
    "DELETE FROM poll_reactions WHERE poll_id = $1 AND reactor_name = $2",
    [pollId, reactorName]
  );

  const summary = await getPollReactionSummary({
    pollId,
    viewerName: reactorName,
  });
  return { success: true, summary };
};

const getCommentReactionSummary = async ({ commentId, viewerName }) => {
  if (!(await ensureCommentExists(commentId))) {
    return null;
  }

  const summary = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END), 0)::int AS likes,
            COALESCE(SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END), 0)::int AS dislikes,
            MAX(CASE WHEN reactor_name = $2 THEN reaction END)::int AS viewer_reaction
     FROM comment_reactions
     WHERE comment_id = $1`,
    [commentId, viewerName ?? null]
  );

  const row = summary.rows[0];
  return {
    commentId,
    likes: row.likes,
    dislikes: row.dislikes,
    viewerReaction:
      row.viewer_reaction === 1
        ? "like"
        : row.viewer_reaction === -1
        ? "dislike"
        : null,
  };
};

const setCommentReaction = async ({ commentId, reactorName, reaction }) => {
  const reactionValue = reactionToValue(reaction);

  if (reactionValue === null) {
    return { success: false, reason: "invalid-reaction" };
  }

  if (!(await ensureCommentExists(commentId))) {
    return { success: false, reason: "comment-not-found" };
  }

  await pool.query(
    `INSERT INTO comment_reactions (comment_id, reactor_name, reaction)
     VALUES ($1, $2, $3)
     ON CONFLICT (comment_id, reactor_name)
     DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()`,
    [commentId, reactorName, reactionValue]
  );

  const summary = await getCommentReactionSummary({
    commentId,
    viewerName: reactorName,
  });

  return { success: true, summary };
};

const clearCommentReaction = async ({ commentId, reactorName }) => {
  if (!(await ensureCommentExists(commentId))) {
    return { success: false, reason: "comment-not-found" };
  }

  await pool.query(
    "DELETE FROM comment_reactions WHERE comment_id = $1 AND reactor_name = $2",
    [commentId, reactorName]
  );

  const summary = await getCommentReactionSummary({
    commentId,
    viewerName: reactorName,
  });

  return { success: true, summary };
};

module.exports = {
  createComment,
  getCommentsByPollId,
  deleteCommentById,
  setPollReaction,
  clearPollReaction,
  getPollReactionSummary,
  setCommentReaction,
  clearCommentReaction,
  getCommentReactionSummary,
};
