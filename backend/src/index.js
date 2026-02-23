require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const {swaggerSpec} = require('./swagger');
const {checkDbHealth} = require('./db');

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: API health check
 *     responses:
 *       200:
 *         description: API is healthy
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'projectBinx-backend',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /health/db:
 *   get:
 *     tags:
 *       - System
 *     summary: Database connectivity check
 *     responses:
 *       200:
 *         description: Database connection successful
 *       500:
 *         description: Database connection failed
 */
app.get('/health/db', async (_req, res) => {
  try {
    const result = await checkDbHealth();
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      now: result.now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'unreachable',
      message: 'Unable to connect to database',
    });
  }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
});
