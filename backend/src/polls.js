const {pool} = require('./db');

const mapPollRow = pollRow => ({
  pollId: pollRow.id,
  user: pollRow.created_by,
  title: pollRow.title,
  description: pollRow.description,
  type: pollRow.poll_type,
  allowComments: pollRow.allow_comments,
  options: [],
});

const attachOptionsToPolls = async polls => {
  if (polls.length === 0) {
    return polls;
  }

  const pollIds = polls.map(poll => poll.pollId);
  const optionsResult = await pool.query(
    `SELECT id, poll_id, option_type_id, option_text
     FROM poll_options
     WHERE poll_id = ANY($1::int[])
     ORDER BY poll_id ASC, option_type_id ASC, id ASC`,
    [pollIds],
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

  return polls.map(poll => ({
    ...poll,
    options: optionsByPollId[poll.pollId] ?? [],
  }));
};

const getPagedPolls = async ({page = 1, pageSize = 20, user, type}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));

  const whereClauses = [];
  const values = [];

  if (user) {
    values.push(user);
    whereClauses.push(`created_by = $${values.length}`);
  }

  if (type) {
    values.push(type);
    whereClauses.push(`poll_type = $${values.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  values.push(safePageSize);
  const limitIndex = values.length;
  values.push((safePage - 1) * safePageSize);
  const offsetIndex = values.length;

  const pollRows = await pool.query(
    `SELECT id, created_by, title, description, poll_type, allow_comments
     FROM polls
     ${whereSql}
     ORDER BY id DESC
     LIMIT $${limitIndex}
     OFFSET $${offsetIndex}`,
    values,
  );

  const mappedPolls = pollRows.rows.map(mapPollRow);
  return attachOptionsToPolls(mappedPolls);
};

const createPoll = async poll => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pollInsert = await client.query(
      `INSERT INTO polls (created_by, title, description, poll_type, allow_comments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_by, title, description, poll_type, allow_comments`,
      [
        poll.user,
        poll.title,
        poll.description ?? null,
        poll.type,
        Boolean(poll.allowComments),
      ],
    );

    const createdPoll = mapPollRow(pollInsert.rows[0]);

    for (const [index, option] of poll.options.entries()) {
      const optionTypeId = option.optionTypeId ?? index + 1;

      await client.query(
        `INSERT INTO poll_options (poll_id, option_type_id, option_text)
         VALUES ($1, $2, $3)`,
        [createdPoll.pollId, optionTypeId, option.optionText],
      );
    }

    await client.query('COMMIT');

    const withOptions = await attachOptionsToPolls([createdPoll]);
    return withOptions[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updatePollById = async (pollId, poll) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updatedPoll = await client.query(
      `UPDATE polls
       SET title = $2,
           description = $3,
           poll_type = $4,
           allow_comments = $5,
           created_by = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, created_by, title, description, poll_type, allow_comments`,
      [
        pollId,
        poll.title,
        poll.description ?? null,
        poll.type,
        Boolean(poll.allowComments),
        poll.user,
      ],
    );

    if (updatedPoll.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM poll_options WHERE poll_id = $1', [pollId]);

    for (const [index, option] of poll.options.entries()) {
      const optionTypeId = option.optionTypeId ?? index + 1;
      await client.query(
        `INSERT INTO poll_options (poll_id, option_type_id, option_text)
         VALUES ($1, $2, $3)`,
        [pollId, optionTypeId, option.optionText],
      );
    }

    await client.query('COMMIT');

    const mappedPoll = mapPollRow(updatedPoll.rows[0]);
    const withOptions = await attachOptionsToPolls([mappedPoll]);
    return withOptions[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deletePollById = async pollId => {
  const deleted = await pool.query('DELETE FROM polls WHERE id = $1 RETURNING id', [
    pollId,
  ]);
  return deleted.rowCount > 0;
};

const findPollById = async pollId => {
  const pollResult = await pool.query(
    `SELECT id, created_by, title, description, poll_type, allow_comments
     FROM polls
     WHERE id = $1`,
    [pollId],
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
    return {success: false, reason: 'poll-not-found'};
  }

  let selectedOptionId = null;
  let sliderValue = null;
  const voterName =
    typeof votePayload === 'object' && votePayload !== null
      ? String(votePayload.voterName ?? '').trim().toLowerCase()
      : '';

  const parsedOptionId =
    typeof votePayload === 'object' && votePayload !== null
      ? Number(votePayload.optionId)
      : Number.NaN;
  const parsedSliderValue =
    typeof votePayload === 'object' && votePayload !== null
      ? Number(votePayload.value ?? votePayload.sliderValue)
      : Number.NaN;

  if (poll.type === 'slider') {
    sliderValue = Number.isNaN(parsedSliderValue)
      ? Number(votePayload)
      : parsedSliderValue;
    if (Number.isNaN(sliderValue)) {
      return {success: false, reason: 'invalid-slider-value'};
    }
    selectedOptionId = getNearestOptionIdForSlider(poll.options, sliderValue);
  } else if (typeof votePayload === 'number') {
    selectedOptionId =
      poll.options[votePayload]?.optionId ??
      poll.options.find(option => option.optionId === votePayload)?.optionId ??
      null;
  } else {
    const optionId = Number.isNaN(parsedOptionId)
      ? votePayload?.optionId
      : parsedOptionId;
    selectedOptionId =
      poll.options.find(option => option.optionId === optionId)?.optionId ?? null;
  }

  if (!selectedOptionId) {
    return {success: false, reason: 'invalid-option'};
  }

  try {
    await pool.query(
      `INSERT INTO poll_votes (poll_id, option_id, voter_name, slider_value)
       VALUES ($1, $2, $3, $4)`,
      [pollId, selectedOptionId, voterName || null, sliderValue],
    );
  } catch (error) {
    if (error?.code === '23505') {
      return {success: false, reason: 'already-voted'};
    }

    throw error;
  }

  return {success: true};
};

const getPollResultsById = async pollId => {
  const rows = await pool.query(
    `SELECT poll_id, option_id, COUNT(*)::int AS votes
     FROM poll_votes
     WHERE poll_id = $1
     GROUP BY poll_id, option_id
     ORDER BY option_id ASC`,
    [pollId],
  );

  return rows.rows.map(row => ({
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