import { compare, hash } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db/database.js';
import { businesses, businessMemberships, users } from '../db/schema.js';
import { AppError } from '../errors.js';
import { ensureCsrfToken } from '../middleware/csrf.js';
import { recordAudit } from '../services/audit.js';

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(320).optional(),
  email: z.string().trim().email().max(320).optional(),
  password: z.string().min(1).max(256),
}).refine((input) => Boolean(input.identifier || input.email), 'Username or email is required.');
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

function regenerateSession(request: Parameters<ReturnType<typeof Router>['use']>[0] extends never ? never : any) {
  return new Promise<void>((resolve, reject) => {
    request.session.regenerate((error: Error | null) => (error ? reject(error) : resolve()));
  });
}

export function authRoutes(db: Database) {
  const router = Router();

  router.get('/session', async (request, response, next) => {
    try {
      const csrfToken = ensureCsrfToken(request);
      if (request.session.isGuest && request.session.role === 'guest' && request.session.businessId) {
        response.json({
          authenticated: true,
          csrfToken,
          user: {
            id: 'guest',
            email: 'guest',
            role: 'guest',
            businessId: request.session.businessId,
          },
        });
        return;
      }
      if (!request.session.userId || !request.session.businessId) {
        response.json({ authenticated: false, csrfToken });
        return;
      }
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          role: businessMemberships.role,
          businessId: businessMemberships.businessId,
        })
        .from(users)
        .innerJoin(businessMemberships, eq(businessMemberships.userId, users.id))
        .where(
          and(
            eq(users.id, request.session.userId),
            eq(users.active, true),
            eq(businessMemberships.businessId, request.session.businessId),
          ),
        )
        .limit(1);
      const user = rows[0];
      if (!user) {
        request.session.destroy(() => undefined);
        response.json({ authenticated: false, csrfToken });
        return;
      }
      response.json({ authenticated: true, csrfToken, user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (request, response, next) => {
    try {
      const input = loginSchema.parse(request.body);
      const identifier = (input.identifier ?? input.email ?? '').toLowerCase();
      if (identifier === 'guest' && input.password === 'guest') {
        const [business] = await db
          .select({ id: businesses.id })
          .from(businesses)
          .where(eq(businesses.slug, 'atelier-union'))
          .limit(1);
        if (!business) {
          throw new AppError(401, 'LOGIN_REJECTED', 'Username/email or password is incorrect.');
        }
        await regenerateSession(request);
        request.session.businessId = business.id;
        request.session.role = 'guest';
        request.session.isGuest = true;
        const csrfToken = ensureCsrfToken(request);
        response.json({
          authenticated: true,
          csrfToken,
          user: { id: 'guest', email: 'guest', role: 'guest', businessId: business.id },
        });
        return;
      }

      const normalizedEmail = identifier;
      const rows = await db
        .select({
          user: users,
          businessId: businessMemberships.businessId,
          role: businessMemberships.role,
        })
        .from(users)
        .innerJoin(businessMemberships, eq(businessMemberships.userId, users.id))
        .where(
          and(eq(users.normalizedEmail, normalizedEmail), eq(users.active, true)),
        )
        .limit(1);
      const match = rows[0];
      const valid = match ? await compare(input.password, match.user.passwordHash) : false;
      if (!match || !valid) {
        throw new AppError(401, 'LOGIN_REJECTED', 'Username/email or password is incorrect.');
      }

      await regenerateSession(request);
      request.session.userId = match.user.id;
      request.session.businessId = match.businessId;
      request.session.role = match.role;
      request.session.isGuest = false;
      const csrfToken = ensureCsrfToken(request);
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, match.user.id));
      response.json({
        authenticated: true,
        csrfToken,
        user: {
          id: match.user.id,
          email: match.user.email,
          role: match.role,
          businessId: match.businessId,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', (request, response, next) => {
    request.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      response.clearCookie('kgd.sid');
      response.status(204).end();
    });
  });

  router.post('/change-password', async (request, response, next) => {
    try {
      if (!request.session.userId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required.');
      const input = changePasswordSchema.parse(request.body);
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, request.session.userId))
        .limit(1);
      const user = rows[0];
      if (!user || !(await compare(input.currentPassword, user.passwordHash))) {
        throw new AppError(400, 'PASSWORD_INCORRECT', 'Current password is incorrect.');
      }
      await db
        .update(users)
        .set({ passwordHash: await hash(input.newPassword, 12), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      if (request.session.businessId) {
        await recordAudit(db, request, {
          businessId: request.session.businessId,
          userId: user.id,
          action: 'security.password_changed',
          entityType: 'user',
          entityId: user.id,
        });
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
