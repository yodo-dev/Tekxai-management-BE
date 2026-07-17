import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env_config } from './config/env.js';
import { swagger_spec } from './config/swagger.js';
import api_routes from './routes/index.js';
import { error_handler, not_found_handler } from './shared/middleware/error-handler.js';
import { build_allowed_origins, is_origin_allowed } from './shared/cors-config.js';
import { authenticate, authorize } from './shared/middleware/authenticate.js';

const app = express();

app.set('trust proxy', 1);
app.use(compression());

// Disable CSP only for swagger routes so inline scripts work
app.use(['/api-docs', '/api/v1/api-docs'], helmet({ contentSecurityPolicy: false }));
app.use(helmet());
// Fixed allowlist — never reflect an arbitrary Origin header back with
// credentials:true, that defeats CORS entirely. CORS_ORIGIN env var (if
// set) can extend this with a comma-separated list, but the app is never
// left wide open by a missing/misconfigured env var.
const ALLOWED_ORIGINS = build_allowed_origins(env_config.cors_origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (is_origin_allowed(origin, ALLOWED_ORIGINS)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
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
app.get('/health', (_req, res) => res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() }));

// Swagger UI — mounted at both /api-docs and /api/v1/api-docs to support both direct and proxied access.
// Production readiness audit finding (Critical/Medium): this previously had no
// auth gate at all, leaking the full API surface to anonymous visitors and,
// via persistAuthorization, letting anyone with a token issue live requests
// straight from the docs UI. Disabled entirely in production; gated to
// authenticated SUPER_ADMIN users in every other environment.
if (env_config.env === 'production') {
  const swagger_disabled = (_req, res) => res.status(404).json({ success: false, message: 'Not found' });
  app.use('/api-docs', swagger_disabled);
  app.use('/api/v1/api-docs', swagger_disabled);
  app.get('/api-docs.json', swagger_disabled);
  app.get('/api/v1/api-docs.json', swagger_disabled);
} else {
  const SWAGGER_ADMIN = [authenticate, authorize('SUPER_ADMIN')];
  const swagger_setup = swaggerUi.setup(swagger_spec, {
    customSiteTitle: 'TekXAI ERP API Docs',
    swaggerOptions: { persistAuthorization: true },
  });
  app.use('/api-docs', SWAGGER_ADMIN, swaggerUi.serve, swagger_setup);
  app.use('/api/v1/api-docs', SWAGGER_ADMIN, swaggerUi.serve, swagger_setup);
  app.get('/api-docs.json', SWAGGER_ADMIN, (_req, res) => res.json(swagger_spec));
  app.get('/api/v1/api-docs.json', SWAGGER_ADMIN, (_req, res) => res.json(swagger_spec));
}

app.use('/api/v1', api_routes);

app.use(not_found_handler);
app.use(error_handler);

export default app;
