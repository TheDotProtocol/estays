import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/helpers';
import { AppError } from '../utils/app-error';
import { JwtPayload } from '@estays/shared';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  req.user = verifyAccessToken(token);
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
