const {Pool} = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false,
});

const checkDbHealth = async () => {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0];
};

module.exports = {
  pool,
  checkDbHealth,
};
