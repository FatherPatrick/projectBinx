const {randomBytes, createHash} = require('node:crypto');
const {pool} = require('./db');

const hashPassword = password =>
  createHash('sha256').update(password).digest('hex');

const createTokenPair = () => ({
  token: randomBytes(24).toString('hex'),
  refreshToken: randomBytes(32).toString('hex'),
});

const toPublicUser = dbUser => ({
  id: dbUser.id,
  phoneNumber: dbUser.phone_number,
  displayName: dbUser.display_name,
});

const findUserByPhone = async phoneNumber => {
  const result = await pool.query(
    `SELECT id, phone_number, password_hash, display_name
     FROM users
     WHERE phone_number = $1`,
    [phoneNumber],
  );

  return result.rows[0] ?? null;
};

const createUser = async ({phoneNumber, password, deviceId}) => {
  const displayName = `User${phoneNumber.slice(-4)}`;
  const passwordHash = hashPassword(password);

  const insertResult = await pool.query(
    `INSERT INTO users (phone_number, password_hash, display_name, device_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, phone_number, display_name`,
    [phoneNumber, passwordHash, displayName, deviceId],
  );

  return insertResult.rows[0];
};

const validateUserPassword = (dbUser, password) => {
  const incomingHash = hashPassword(password);
  return dbUser.password_hash === incomingHash;
};

const createSession = async ({userId, deviceId}) => {
  const {token, refreshToken} = createTokenPair();

  await pool.query(
    `INSERT INTO user_sessions (user_id, token, refresh_token, device_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, refreshToken, deviceId],
  );

  return {token, refreshToken};
};

module.exports = {
  findUserByPhone,
  createUser,
  validateUserPassword,
  createSession,
  toPublicUser,
};
