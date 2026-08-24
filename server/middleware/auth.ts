import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { Database } from '../db/database.js';
import { businessMemberships, users } from '../db/schema.js';

export type AdminAuth = {
  userId: string;
  businessId: string;
  role: 'owner' | 'admin' | 'guest';
  email: string;
};

export type AdminRequest = Request & { adminAuth: AdminAuth };

export function requireAdmin(db: Database) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (request.session.isGuest && request.session.role === 'guest' && request.session.businessId) {
        (request as AdminRequest).adminAuth = {
          userId: 'guest',
          businessId: request.session.businessId,
          role: 'guest',
          email: 'guest',
        };
        next();
        return;
      }
      if (!request.session.userId || !request.session.businessId) {
        response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } });
        return;
      }
      const rows = await db
        .select({
          userId: users.id,
          businessId: businessMemberships.businessId,
          role: businessMemberships.role,
          email: users.email,
        })
        .from(businessMemberships)
        .innerJoin(users, eq(users.id, businessMemberships.userId))
        .where(
          and(
            eq(users.id, request.session.userId),
            eq(users.active, true),
            eq(businessMemberships.businessId, request.session.businessId),
          ),
        )
        .limit(1);
      const auth = rows[0];
      if (!auth) {
        request.session.destroy(() => undefined);
        response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } });
        return;
      }
      (request as AdminRequest).adminAuth = auth;
      next();
    } catch (error) {
      next(error);
    }
  };
}
