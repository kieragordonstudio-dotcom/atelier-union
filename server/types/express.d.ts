import type { AdminAuth } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      adminAuth: AdminAuth;
    }
  }
}

export {};
