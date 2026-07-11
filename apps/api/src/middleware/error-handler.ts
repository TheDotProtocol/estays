import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '@estays/logger';
import { AppError } from '../utils/app-error';
import { sendError } from '../utils/response';

const log = createChildLogger('error-handler');

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error({ err, url: req.originalUrl, method: req.method }, err.message);
    }
    return sendError(res, err);
  }

  log.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');

  const appError = new AppError(
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
  return sendError(res, appError);
}
