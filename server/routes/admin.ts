import { Router } from 'express';
import type { DatabaseContext } from '../db/database.js';
import { requireAdmin, type AdminRequest } from '../middleware/auth.js';
import { clientRoutes } from './admin/clients.js';
import { dashboardCalendarRoutes } from './admin/dashboardCalendar.js';
import { lookbookRoutes } from './admin/lookbook.js';
import { serviceRoutes } from './admin/services.js';
import { settingsReportRoutes } from './admin/settingsReports.js';
import { teamRoutes } from './admin/team.js';

export function adminRoutes(context: DatabaseContext) {
  const router = Router();
  router.use(requireAdmin(context.db));
  const guestRoutes = new Set(['/services', '/team', '/lookbook', '/website', '/analytics']);
  router.use((request, response, next) => {
    const auth = (request as AdminRequest).adminAuth;
    if (auth.role !== 'guest') {
      next();
      return;
    }
    if (request.method === 'GET' && guestRoutes.has(request.path)) {
      next();
      return;
    }
    response.status(403).json({
      error: { code: 'GUEST_READ_ONLY', message: 'Guest preview access is read-only.' },
    });
  });
  router.use(dashboardCalendarRoutes(context));
  router.use(lookbookRoutes(context));
  router.use(clientRoutes(context));
  router.use(serviceRoutes(context));
  router.use(teamRoutes(context));
  router.use(settingsReportRoutes(context));
  return router;
}
