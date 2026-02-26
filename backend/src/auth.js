const { randomBytes, createHash } = require("node:crypto");
const { pool } = require("./db");

const hashPassword = (password) =>
  createHash("sha256").update(password).digest("hex");

const createTokenPair = () => ({
  token: randomBytes(24).toString("hex"),
  refreshToken: randomBytes(32).toString("hex"),
});

const toPublicUser = (dbUser) => ({
  id: dbUser.id,
  phoneNumber: dbUser.phone_number,
  email: dbUser.email,
  displayName: dbUser.display_name,
});

const findUserByPhone = async (phoneNumber) => {
  const result = await pool.query(
    `SELECT id, phone_number, email, password_hash, display_name
     FROM users
     WHERE phone_number = $1`,
    [phoneNumber]
  );

  return result.rows[0] ?? null;
};

const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, phone_number, email, password_hash, display_name
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  return result.rows[0] ?? null;
};

const createUser = async ({ phoneNumber, email, password, deviceId }) => {
  const normalizedPhone = String(phoneNumber || "").trim() || null;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase() || null;
  const identitySeed = normalizedPhone ?? normalizedEmail ?? "user";
  const displayName = `User${identitySeed.slice(-4)}`;
  const passwordHash = hashPassword(password);

  const insertResult = await pool.query(
    `INSERT INTO users (phone_number, email, password_hash, display_name, device_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, phone_number, email, display_name`,
    [normalizedPhone, normalizedEmail, passwordHash, displayName, deviceId]
  );

  return insertResult.rows[0];
};

const validateUserPassword = (dbUser, password) => {
  const incomingHash = hashPassword(password);
  return dbUser.password_hash === incomingHash;
};

const createSession = async ({ userId, deviceId }) => {
  const { token, refreshToken } = createTokenPair();

  await pool.query(
    `INSERT INTO user_sessions (user_id, token, refresh_token, device_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, refreshToken, deviceId]
  );

  return { token, refreshToken };
};

const deleteUserAccount = async ({ userId, phoneNumber, email }) => {
  if (userId !== undefined && userId !== null) {
    const deletedById = await pool.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    return deletedById.rowCount > 0;
  }

  if (phoneNumber) {
    const deletedByPhone = await pool.query(
      `DELETE FROM users
       WHERE phone_number = $1
       RETURNING id`,
      [phoneNumber]
    );

    if (deletedByPhone.rowCount > 0) {
      return true;
    }
  }

  if (email) {
    const deletedByEmail = await pool.query(
      `DELETE FROM users
       WHERE LOWER(email) = LOWER($1)
       RETURNING id`,
      [email]
    );

    return deletedByEmail.rowCount > 0;
  }

  return false;
};

module.exports = {
  findUserByPhone,
  findUserByEmail,
  createUser,
  validateUserPassword,
  createSession,
  deleteUserAccount,
  toPublicUser,
};
