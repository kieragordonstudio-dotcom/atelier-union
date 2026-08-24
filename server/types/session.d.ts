import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    businessId?: string;
    role?: 'owner' | 'admin';
    csrfToken?: string;
  }
}
