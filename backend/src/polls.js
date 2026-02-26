const { pool } = require("./db");

const MAX_POLL_DISTANCE_MILES = 25;
const EARTH_RADIUS_MILES = 3959;

const normalizeCoordinate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapPollRow = (pollRow) => ({
  pollId: pollRow.id,
  user: pollRow.created_by,
  title: pollRow.title,
  description: pollRow.description,
  type: pollRow.poll_type,
  allowComments: pollRow.allow_comments,
  latitude:
    pollRow.latitude === null || pollRow.latitude === undefined
      ? undefined
      : Number(pollRow.latitude),
  longitude:
    pollRow.longitude === null || pollRow.longitude === undefined
      ? undefined
      : Number(pollRow.longitude),
  commentCount: Number(pollRow.comment_count ?? 0),
  likes: Number(pollRow.likes ?? 0),
  dislikes: Number(pollRow.dislikes ?? 0),
  createdAt: pollRow.created_at,
  updatedAt: pollRow.updated_at,
  options: [],
});

const attachOptionsToPolls = async (polls) => {
  if (polls.length === 0) {
    return polls;
  }

  const pollIds = polls.map((poll) => poll.pollId);
  const optionsResult = await pool.query(
    `SELECT id, poll_id, option_type_id, option_text
     FROM poll_options
     WHERE poll_id = ANY($1::int[])
     ORDER BY poll_id ASC, option_type_id ASC, id ASC`,
    [pollIds]
  );

  const optionsByPollId = optionsResult.rows.reduce((acc, row) => {
    if (!acc[row.poll_id]) {
      acc[row.poll_id] = [];
    }

    acc[row.poll_id].push({
      optionId: row.id,
      optionTypeId: row.option_type_id,
      optionText: row.option_text,
    });

    return acc;
  }, {});

  return polls.map((poll) => ({
    ...poll,
    options: optionsByPollId[poll.pollId] ?? [],
  }));
};

const getPagedPolls = async ({
  page = 1,
  pageSize = 20,
  user,
  type,
  viewerLatitude,
  viewerLongitude,
  bypassDistanceFilter = false,
}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const safeViewerLatitude = Number(viewerLatitude);
  const safeViewerLongitude = Number(viewerLongitude);

  const whereClauses = [];
  const values = [];

  if (!bypassDistanceFilter) {
    values.push(safeViewerLatitude);
    const viewerLatitudeIndex = values.length;
    values.push(safeViewerLongitude);
    const viewerLongitudeIndex = values.length;

    whereClauses.push("p.latitude IS NOT NULL");
    whereClauses.push("p.longitude IS NOT NULL");
    whereClauses.push(`(
        ${EARTH_RADIUS_MILES} * ACOS(
          LEAST(1, GREATEST(-1,
            COS(RADIANS($${viewerLatitudeIndex})) * COS(RADIANS(p.latitude)) *
            COS(RADIANS(p.longitude) - RADIANS($${viewerLongitudeIndex})) +
            SIN(RADIANS($${viewerLatitudeIndex})) * SIN(RADIANS(p.latitude))
          ))
        )
      ) <= ${MAX_POLL_DISTANCE_MILES}`);
  }

  if (user) {
    values.push(user);
    whereClauses.push(`created_by = $${values.length}`);
  }

  if (type) {
    values.push(type);
    whereClauses.push(`poll_type = $${values.length}`);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  values.push(safePageSize);
  const limitIndex = values.length;
  values.push((safePage - 1) * safePageSize);
  const offsetIndex = values.length;

  const pollRows = await pool.query(
    `SELECT p.id,
            p.created_by,
            p.title,
            p.description,
            p.poll_type,
            p.allow_comments,
            p.latitude,
            p.longitude,
            p.created_at,
            p.updated_at,
            COALESCE(comment_counts.comment_count, 0)::int AS comment_count,
            COALESCE(reaction_counts.likes, 0)::int AS likes,
            COALESCE(reaction_counts.dislikes, 0)::int AS dislikes
     FROM polls p
     LEFT JOIN (
       SELECT poll_id, COUNT(*)::int AS comment_count
       FROM poll_comments
       GROUP BY poll_id
     ) AS comment_counts ON comment_counts.poll_id = p.id
     LEFT JOIN (
       SELECT poll_id,
              SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END)::int AS likes,
              SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END)::int AS dislikes
       FROM poll_reactions
       GROUP BY poll_id
     ) AS reaction_counts ON reaction_counts.poll_id = p.id
     ${whereSql}
     ORDER BY p.id DESC
     LIMIT $${limitIndex}
     OFFSET $${offsetIndex}`,
    values
  );

  const mappedPolls = pollRows.rows.map(mapPollRow);
  return attachOptionsToPolls(mappedPolls);
};

const createPoll = async (poll) => {
  const client = await pool.connect();
  const allowComments = poll.type === "ama" ? true : Boolean(poll.allowComments);
  const latitude = normalizeCoordinate(poll.latitude);
  const longitude = normalizeCoordinate(poll.longitude);

  try {
    await client.query("BEGIN");

    const pollInsert = await client.query(
      `INSERT INTO polls (created_by, title, description, poll_type, allow_comments, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_by, title, description, poll_type, allow_comments, latitude, longitude, created_at, updated_at`,
      [
        poll.user,
        poll.title,
        poll.description ?? null,
        poll.type,
        allowComments,
        latitude,
        longitude,
      ]
    );

    const createdPoll = mapPollRow(pollInsert.rows[0]);

    for (const [index, option] of poll.options.entries()) {
      const optionTypeId = option.optionTypeId ?? index + 1;

      await client.query(
        `INSERT INTO poll_options (poll_id, option_type_id, option_text)
         VALUES ($1, $2, $3)`,
        [createdPoll.pollId, optionTypeId, option.optionText]
      );
    }

    await client.query("COMMIT");

    const withOptions = await attachOptionsToPolls([createdPoll]);
    return withOptions[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updatePollById = async (pollId, poll) => {
  const client = await pool.connect();
  const allowComments = poll.type === "ama" ? true : Boolean(poll.allowComments);
  const latitude = normalizeCoordinate(poll.latitude);
  const longitude = normalizeCoordinate(poll.longitude);

  try {
    await client.query("BEGIN");

    const updatedPoll = await client.query(
      `UPDATE polls
       SET title = $2,
           description = $3,
           poll_type = $4,
           allow_comments = $5,
           created_by = $6,
           latitude = COALESCE($7, latitude),
           longitude = COALESCE($8, longitude),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, created_by, title, description, poll_type, allow_comments, latitude, longitude, created_at, updated_at`,
      [
        pollId,
        poll.title,
        poll.description ?? null,
        poll.type,
        allowComments,
        poll.user,
        latitude,
        longitude,
      ]
    );

    if (updatedPoll.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("DELETE FROM poll_options WHERE poll_id = $1", [pollId]);

    for (const [index, option] of poll.options.entries()) {
      const optionTypeId = option.optionTypeId ?? index + 1;
      await client.query(
        `INSERT INTO poll_options (poll_id, option_type_id, option_text)
         VALUES ($1, $2, $3)`,
        [pollId, optionTypeId, option.optionText]
      );
    }

    await client.query("COMMIT");

    const mappedPoll = mapPollRow(updatedPoll.rows[0]);
    const withOptions = await attachOptionsToPolls([mappedPoll]);
    return withOptions[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deletePollById = async (pollId) => {
  const deleted = await pool.query(
    "DELETE FROM polls WHERE id = $1 RETURNING id",
    [pollId]
  );
  return deleted.rowCount > 0;
};

const findPollById = async (pollId) => {
  const pollResult = await pool.query(
    `SELECT p.id,
            p.created_by,
            p.title,
            p.description,
            p.poll_type,
            p.allow_comments,
            p.latitude,
            p.longitude,
            p.created_at,
            p.updated_at,
            COALESCE(comment_counts.comment_count, 0)::int AS comment_count,
            COALESCE(reaction_counts.likes, 0)::int AS likes,
            COALESCE(reaction_counts.dislikes, 0)::int AS dislikes
     FROM polls p
     LEFT JOIN (
       SELECT poll_id, COUNT(*)::int AS comment_count
       FROM poll_comments
       GROUP BY poll_id
     ) AS comment_counts ON comment_counts.poll_id = p.id
     LEFT JOIN (
       SELECT poll_id,
              SUM(CASE WHEN reaction = 1 THEN 1 ELSE 0 END)::int AS likes,
              SUM(CASE WHEN reaction = -1 THEN 1 ELSE 0 END)::int AS dislikes
       FROM poll_reactions
       GROUP BY poll_id
     ) AS reaction_counts ON reaction_counts.poll_id = p.id
     WHERE p.id = $1`,
    [pollId]
  );

  if (pollResult.rowCount === 0) {
    return null;
  }

  const mapped = mapPollRow(pollResult.rows[0]);
  const withOptions = await attachOptionsToPolls([mapped]);
  return withOptions[0];
};

const getNearestOptionIdForSlider = (options, sliderValue) => {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  const normalized = Math.max(0, Math.min(100, Number(sliderValue) || 0));
  const bucketIndex = Math.round((normalized / 100) * (options.length - 1));
  return options[bucketIndex]?.optionId ?? options[0].optionId;
};

const voteById = async (pollId, votePayload) => {
  const poll = await findPollById(pollId);

  if (!poll) {
    return { success: false, reason: "poll-not-found" };
  }

  let selectedOptionId = null;
  let sliderValue = null;
  const voterName =
    typeof votePayload === "object" && votePayload !== null
      ? String(votePayload.voterName ?? "")
          .trim()
          .toLowerCase()
      : "";

  const parsedOptionId =
    typeof votePayload === "object" && votePayload !== null
      ? Number(votePayload.optionId)
      : Number.NaN;
  const parsedSliderValue =
    typeof votePayload === "object" && votePayload !== null
      ? Number(votePayload.value ?? votePayload.sliderValue)
      : Number.NaN;

  if (poll.type === "slider") {
    sliderValue = Number.isNaN(parsedSliderValue)
      ? Number(votePayload)
      : parsedSliderValue;
    if (Number.isNaN(sliderValue)) {
      return { success: false, reason: "invalid-slider-value" };
    }
    selectedOptionId = getNearestOptionIdForSlider(poll.options, sliderValue);
  } else if (typeof votePayload === "number") {
    selectedOptionId =
      poll.options[votePayload]?.optionId ??
      poll.options.find((option) => option.optionId === votePayload)
        ?.optionId ??
      null;
  } else {
    const optionId = Number.isNaN(parsedOptionId)
      ? votePayload?.optionId
      : parsedOptionId;
    selectedOptionId =
      poll.options.find((option) => option.optionId === optionId)?.optionId ??
      null;
  }

  if (!selectedOptionId) {
    return { success: false, reason: "invalid-option" };
  }

  try {
    await pool.query(
      `INSERT INTO poll_votes (poll_id, option_id, voter_name, slider_value)
       VALUES ($1, $2, $3, $4)`,
      [pollId, selectedOptionId, voterName || null, sliderValue]
    );
  } catch (error) {
    if (error?.code === "23505") {
      return { success: false, reason: "already-voted" };
    }

    throw error;
  }

  return { success: true };
};

const getPollResultsById = async (pollId) => {
  const rows = await pool.query(
    `SELECT poll_id, option_id, COUNT(*)::int AS votes
     FROM poll_votes
     WHERE poll_id = $1
     GROUP BY poll_id, option_id
     ORDER BY option_id ASC`,
    [pollId]
  );

  return rows.rows.map((row) => ({
    pollId: row.poll_id,
    optionId: row.option_id,
    votes: row.votes,
  }));
};

module.exports = {
  getPagedPolls,
  createPoll,
  updatePollById,
  deletePollById,
  voteById,
  getPollResultsById,
};
