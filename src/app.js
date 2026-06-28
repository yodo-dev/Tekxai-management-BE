import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env_config } from './config/env.js';
import { swagger_spec } from './config/swagger.js';
import api_routes from './routes/index.js';
import { error_handler, not_found_handler } from './shared/middleware/error-handler.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env_config.cors_origin === '*' ? true : env_config.cors_origin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit auth endpoints
app.use(
  '/api/v1/auth',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false }),
);

// Health check
app.get('/api/v1/health', (_req, res) => res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() }));

app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swagger_spec, {
  customSiteTitle: 'TekXAI ERP API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/v1/api-docs.json', (_req, res) => res.json(swagger_spec));

app.use('/api/v1', api_routes);

app.use(not_found_handler);
app.use(error_handler);

export default app;
