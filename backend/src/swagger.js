const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'projectBinx API',
      version: '1.0.0',
      description: 'Backend API for projectBinx mobile app',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
        description: 'Local server',
      },
    ],
  },
  apis: ['./src/index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerSpec,
};
