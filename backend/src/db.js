const { Pool } = require("pg");
const { createHash } = require("node:crypto");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const checkDbHealth = async () => {
  const result = await pool.query("SELECT NOW() AS now");
  return result.rows[0];
};

const hashPassword = (password) =>
  createHash("sha256").update(password).digest("hex");

const parseCoordinateOrDefault = (value, fallback, min, max) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
};

const pollBackfillLatitude = parseCoordinateOrDefault(
  process.env.POLL_BACKFILL_LATITUDE,
  39.8283,
  -90,
  90
);

const pollBackfillLongitude = parseCoordinateOrDefault(
  process.env.POLL_BACKFILL_LONGITUDE,
  -98.5795,
  -180,
  180
);

const ensureAuthSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone_number VARCHAR(30),
      email VARCHAR(255),
      password_hash TEXT NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      device_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
  await pool.query(`ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;`);
  await pool.query(
    `UPDATE users SET phone_number = NULL WHERE phone_number IS NOT NULL AND TRIM(phone_number) = '';`
  );
  await pool.query(
    `UPDATE users SET email = NULL WHERE email IS NOT NULL AND TRIM(email) = '';`
  );
  await pool.query(
    `UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;`
  );

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower
    ON users(LOWER(email))
    WHERE email IS NOT NULL AND TRIM(email) <> '';
  `);

  await pool.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_one_required;`
  );
  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_contact_one_required
    CHECK (
      (
        CASE WHEN phone_number IS NOT NULL AND TRIM(phone_number) <> '' THEN 1 ELSE 0 END +
        CASE WHEN email IS NOT NULL AND TRIM(email) <> '' THEN 1 ELSE 0 END
      ) = 1
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      device_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensurePollSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS polls (
      id SERIAL PRIMARY KEY,
      created_by VARCHAR(120) NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      poll_type VARCHAR(30) NOT NULL,
      allow_comments BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_type_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_poll_options_poll_id_option_type_id
    ON poll_options(poll_id, option_type_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
      voter_name VARCHAR(120),
      slider_value NUMERIC(10, 4),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS voter_name VARCHAR(120);`
  );

  await pool.query(
    `UPDATE poll_votes
     SET voter_name = CONCAT('seed_', id)
     WHERE voter_name IS NULL OR TRIM(voter_name) = '';`
  );

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_poll_votes_one_per_user_per_poll
    ON poll_votes(poll_id, voter_name)
    WHERE
      voter_name IS NOT NULL
      AND TRIM(voter_name) <> ''
      AND LOWER(voter_name) NOT LIKE 'qa_%'
      AND LOWER(voter_name) NOT IN ('poll_tester', 'debug_user', 'qa_debug', 'qa_user');
  `);

  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS created_by VARCHAR(120);`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT;`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS poll_type VARCHAR(30);`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS user_name VARCHAR(120);`
  );
  await pool.query(`ALTER TABLE polls ADD COLUMN IF NOT EXISTS question TEXT;`);
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS type VARCHAR(30);`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT false;`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;`
  );
  await pool.query(
    `ALTER TABLE polls ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;`
  );
  await pool.query(
    `UPDATE polls
     SET latitude = $1,
         longitude = $2
     WHERE latitude IS NULL OR longitude IS NULL;`,
    [pollBackfillLatitude, pollBackfillLongitude]
  );

  await pool.query(
    `UPDATE polls SET created_by = COALESCE(created_by, user_name, 'unknown') WHERE created_by IS NULL;`
  );
  await pool.query(
    `UPDATE polls SET description = COALESCE(description, question) WHERE description IS NULL;`
  );
  await pool.query(
    `UPDATE polls SET poll_type = COALESCE(poll_type, type, 'simple') WHERE poll_type IS NULL;`
  );
  await pool.query(
    `UPDATE polls
     SET poll_type = CASE
       WHEN LOWER(TRIM(COALESCE(poll_type, ''))) IN ('simple', 'slider', 'ama')
         THEN LOWER(TRIM(poll_type))
       ELSE 'ama'
     END;`
  );
  await pool.query(
    `ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_poll_type_allowed;`
  );
  await pool.query(
    `ALTER TABLE polls
     ADD CONSTRAINT polls_poll_type_allowed
     CHECK (poll_type IN ('simple', 'slider', 'ama'));`
  );
  await pool.query(
    `UPDATE polls SET allow_comments = true WHERE poll_type = 'ama';`
  );

  await pool.query(
    `ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS option_type_id INTEGER;`
  );
  await pool.query(
    `ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS option_index INTEGER;`
  );
  await pool.query(
    `UPDATE poll_options SET option_type_id = COALESCE(option_type_id, option_index, id) WHERE option_type_id IS NULL;`
  );

  await pool.query(
    `ALTER TABLE poll_options ALTER COLUMN option_type_id SET NOT NULL;`
  );

  await pool.query(
    `DROP INDEX IF EXISTS ux_poll_options_poll_id_option_index;`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_comments (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      author_name VARCHAR(120) NOT NULL,
      author_alias VARCHAR(120),
      content TEXT NOT NULL,
      parent_comment_id INTEGER REFERENCES poll_comments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS author_alias VARCHAR(120);`
  );
  await pool.query(
    `ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS author_avatar_initials VARCHAR(8);`
  );
  await pool.query(
    `ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS author_avatar_color VARCHAR(32);`
  );

  await pool.query(`
    CREATE INDEX IF NOT EXISTS ix_poll_comments_poll_id_created_at
    ON poll_comments(poll_id, created_at ASC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS ix_poll_comments_parent_comment_id
    ON poll_comments(parent_comment_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_reactions (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      reactor_name VARCHAR(120) NOT NULL,
      reaction SMALLINT NOT NULL CHECK (reaction IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_poll_reactions_poll_id_reactor_name
    ON poll_reactions(poll_id, reactor_name);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comment_reactions (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL REFERENCES poll_comments(id) ON DELETE CASCADE,
      reactor_name VARCHAR(120) NOT NULL,
      reaction SMALLINT NOT NULL CHECK (reaction IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_comment_reactions_comment_id_reactor_name
    ON comment_reactions(comment_id, reactor_name);
  `);
};

const seedDefaultUsers = async () => {
  const defaultUsers = [
    {
      phoneNumber: "5550001111",
      password: "TestPass123!",
      displayName: "QA Demo User",
    },
    {
      phoneNumber: "5550002222",
      password: "PollsRock456!",
      displayName: "Poll Tester",
    },
  ];

  for (const user of defaultUsers) {
    await pool.query(
      `INSERT INTO users (phone_number, password_hash, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone_number) DO NOTHING`,
      [user.phoneNumber, hashPassword(user.password), user.displayName]
    );
  }
};

const defaultPolls = [
  {
    user: "john_doe",
    title: "Should we implement dark mode?",
    description: "Vote on whether we should add a dark theme to the app",
    type: "simple",
    allowComments: true,
    options: ["Yes", "No"],
  },
  {
    user: "jane_smith",
    title: "Best programming language?",
    description:
      "Choose your favorite programming language for mobile development",
    type: "simple",
    allowComments: true,
    options: ["JavaScript", "TypeScript", "Dart", "Swift", "Kotlin"],
  },
  {
    user: "mike_wilson",
    title: "Thumbs up or down?",
    description: "Simple up/down vote on the new feature",
    type: "simple",
    allowComments: false,
    options: ["Up", "Down"],
  },
  {
    user: "sarah_jones",
    title: "Rate our app experience",
    description: "How would you rate your overall experience with our app?",
    type: "slider",
    allowComments: true,
    options: ["Terrible", "Poor", "Average", "Good", "Excellent"],
  },
  {
    user: "alex_brown",
    title: "Coffee or Tea?",
    description: null,
    type: "simple",
    allowComments: false,
    options: ["Coffee", "Tea"],
  },
  {
    user: "emily_davis",
    title: "Favorite social media platform",
    description: "Which platform do you use most often?",
    type: "simple",
    allowComments: true,
    options: ["Twitter", "Instagram", "TikTok", "LinkedIn", "Facebook"],
  },
  {
    user: "qa_user",
    title:
      "Very long title: Would you use an app experience that includes detailed voting analytics, comment moderation, and customizable preference settings?",
    description:
      "This poll is intentionally verbose to test text wrapping and layout behavior on smaller screens.",
    type: "simple",
    allowComments: true,
    options: [
      "Absolutely, I would use it daily",
      "Maybe, depending on performance",
    ],
  },
  {
    user: "qa_user",
    title: "Minimal poll with no description",
    description: null,
    type: "simple",
    allowComments: false,
    options: ["Option A", "Option B"],
  },
  {
    user: "qa_user",
    title: "Slider poll with many options",
    description: "Used to test rendering and scrolling of longer option lists.",
    type: "slider",
    allowComments: true,
    options: [
      "Strongly dislike",
      "Dislike",
      "Neutral",
      "Like",
      "Strongly like",
      "Love it",
    ],
  },
  {
    user: "qa_user",
    title: "Unsupported poll type coverage",
    description: "This validates behavior for poll types not rendered yet.",
    type: "ama",
    allowComments: true,
    options: ["Alpha", "Beta", "Gamma"],
  },
];

const defaultVoteCounts = {
  "Should we implement dark mode?": [45, 23],
  "Best programming language?": [12, 34, 8, 15, 19],
  "Thumbs up or down?": [67, 31],
  "Rate our app experience": [5, 12, 28, 41, 22],
  "Coffee or Tea?": [89, 56],
  "Favorite social media platform": [23, 45, 67, 12, 34],
};

const seedDefaultPolls = async () => {
  const existingPollCount = await pool.query(
    "SELECT COUNT(*)::int AS count FROM polls"
  );

  if ((existingPollCount.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const poll of defaultPolls) {
      const insertedPoll = await client.query(
        `INSERT INTO polls (created_by, title, description, poll_type, allow_comments)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [poll.user, poll.title, poll.description, poll.type, poll.allowComments]
      );

      const pollId = insertedPoll.rows[0].id;
      const insertedOptionIds = [];

      for (const [index, optionText] of poll.options.entries()) {
        const optionTypeId = index + 1;
        const insertedOption = await client.query(
          `INSERT INTO poll_options (poll_id, option_type_id, option_text)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [pollId, optionTypeId, optionText]
        );

        insertedOptionIds.push(insertedOption.rows[0].id);
      }

      const voteCounts = defaultVoteCounts[poll.title] ?? [];

      for (const [index, voteCount] of voteCounts.entries()) {
        const optionId = insertedOptionIds[index];
        if (!optionId || voteCount <= 0) {
          continue;
        }

        for (let i = 0; i < voteCount; i += 1) {
          await client.query(
            `INSERT INTO poll_votes (poll_id, option_id, voter_name, slider_value)
             VALUES ($1, $2, $3, NULL)`,
            [pollId, optionId, `seed_${pollId}_${optionId}_${i + 1}`]
          );
        }
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  checkDbHealth,
  ensureAuthSchema,
  ensurePollSchema,
  seedDefaultUsers,
  seedDefaultPolls,
};
