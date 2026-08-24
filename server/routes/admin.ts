import { Router } from 'express';
import type { DatabaseContext } from '../db/database.js';
import { requireAdmin } from '../middleware/auth.js';
import { clientRoutes } from './admin/clients.js';
import { dashboardCalendarRoutes } from './admin/dashboardCalendar.js';
import { serviceRoutes } from './admin/services.js';
import { settingsReportRoutes } from './admin/settingsReports.js';
import { teamRoutes } from './admin/team.js';

export function adminRoutes(context: DatabaseContext) {
  const router = Router();
  router.use(requireAdmin(context.db));
  router.use(dashboardCalendarRoutes(context));
  router.use(clientRoutes(context));
  router.use(serviceRoutes(context));
  router.use(teamRoutes(context));
  router.use(settingsReportRoutes(context));
  return router;
}
