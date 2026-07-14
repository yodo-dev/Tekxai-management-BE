// Test bootstrap — loads .env.development into process.env before any test
// file (or the modules it imports, e.g. the Prisma/pg client) runs. This is
// the only thing this file does: it does not import server.js or
// config/env.js, so none of their side effects (JWT secret checks, server
// startup, etc.) run here.
import { config } from 'dotenv';

config({ path: '.env.development' });
