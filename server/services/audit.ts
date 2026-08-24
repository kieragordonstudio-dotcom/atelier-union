import type { Request } from 'express';
import type { Database } from '../db/database.js';
import { auditLogs } from '../db/schema.js';

export async function recordAudit(
  db: Database,
  request: Request,
  input: {
    businessId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(auditLogs).values({
    businessId: input.businessId,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
    ipAddress: request.ip,
  });
}
