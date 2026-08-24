import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function ensureCsrfToken(request: Request) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = randomBytes(32).toString('hex');
  }
  return request.session.csrfToken;
}

export function csrfProtection(request: Request, response: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  const expected = request.session.csrfToken;
  const supplied = request.get('x-csrf-token');
  if (!expected || !supplied) {
    response.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Request could not be verified.' } });
    return;
  }
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    response.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Request could not be verified.' } });
    return;
  }
  next();
}
