import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TekXAI ERP API',
      version: '1.0.0',
      description: 'Complete REST API for TekXAI ERP — HR, Projects, Timesheets, CRM, Payroll, Monitoring and more.',
      contact: { name: 'TekXAI', email: 'support@tekxai.com' },
    },
    servers: [
      { url: 'https://api.tekxai.services/api/v1', description: 'Production' },
      { url: 'http://localhost:5000/api/v1', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from POST /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            payload: { type: 'object' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [
    './src/modules/**/routes/*.routes.js',
    './src/modules/**/routes/*.js',
    './src/modules/**/*.routes.js',
    './src/modules/**/jd.routes.js',
    './src/modules/jd/jd.routes.js',
  ],
};

export const swagger_spec = swaggerJsdoc(options);
