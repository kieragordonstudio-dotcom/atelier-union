import { randomUUID } from 'node:crypto';
import path from 'node:path';
import compression from 'compression';
import connectPgSimple from 'connect-pg-simple';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import session, { type Store } from 'express-session';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import type { DatabaseContext } from './db/database.js';
import { AppError } from './errors.js';
import { csrfProtection } from './middleware/csrf.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

export type AppOptions = {
  sessionStore?: Store;
  serveFrontend?: boolean;
};

export function createApp(
  config: AppConfig,
  context: DatabaseContext,
  options: AppOptions = {},
) {
  const app = express();
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    response.locals.requestId = randomUUID();
    response.setHeader('X-Request-Id', response.locals.requestId);
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: config.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));

  const PgSession = connectPgSimple(session);
  const sessionStore =
    options.sessionStore ??
    new PgSession({
      pool: context.pool,
      tableName: 'session',
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15,
    });
  app.use(
    session({
      name: 'kgd.sid',
      secret: config.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  app.get('/api/health', async (_request, response, next) => {
    try {
      await context.pool.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many login attempts. Try again later.' } },
  });
  const api = express.Router();
  api.use('/auth/login', loginLimiter);
  api.use(csrfProtection);
  api.use('/auth', authRoutes(context.db));
  api.use('/public', publicRoutes(context));
  api.use('/admin', adminRoutes(context));
  app.use('/api', api);
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });

  if (options.serveFrontend !== false) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false, maxAge: config.NODE_ENV === 'production' ? '1h' : 0 }));
    app.use((request, response, next) => {
      if (request.method !== 'GET') {
        next();
        return;
      }
      if (request.path.startsWith('/KGD')) {
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      response.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the submitted details.',
          fields: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        },
      });
      return;
    }
    if (error instanceof AppError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    console.error(`[${response.locals.requestId}]`, error);
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: config.NODE_ENV === 'production' ? 'Something went wrong.' : String(error),
      },
    });
  };
  app.use(errorHandler);

  return app;
}
