import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    businessId?: string;
    role?: 'owner' | 'admin' | 'guest';
    isGuest?: boolean;
    csrfToken?: string;
  }
}
