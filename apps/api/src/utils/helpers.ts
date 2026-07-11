import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '@estays/shared';
import { AppError } from './app-error';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '45m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: REFRESH_EXPIRES as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    if (payload.type !== 'access') throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('INVALID_TOKEN', 'Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as JwtPayload;
    if (payload.type !== 'refresh') throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('INVALID_TOKEN', 'Invalid or expired refresh token', 401);
  }
}

export function getTokenExpirySeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] || 60);
}

export function generateBookingNumber(): string {
  const date = new Date();
  const prefix = 'EST';
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function getDateRange(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function parseDecimal(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}
