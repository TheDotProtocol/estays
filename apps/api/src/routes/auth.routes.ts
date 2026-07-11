import { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { registerSchema, partnerRegisterSchema, sendOtpSchema, loginSchema, refreshTokenSchema } from '@estays/shared';
import { validate } from '../middleware/validate';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts' } },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many OTP requests. Try again later.' } },
});

export const authRouter = Router();

authRouter.post('/send-otp', otpLimiter, validate(sendOtpSchema), async (req: AuthRequest, res: Response) => {
  const result = await authService.sendOtp(req.body.email, req.body.purpose);
  sendSuccess(res, result);
});

authRouter.post('/register', authLimiter, validate(registerSchema), async (req: AuthRequest, res: Response) => {
  const result = await authService.register(req.body, req.ip);
  sendCreated(res, result);
});

authRouter.post('/register-partner', authLimiter, validate(partnerRegisterSchema), async (req: AuthRequest, res: Response) => {
  const result = await authService.registerPartner(req.body, req.ip);
  sendCreated(res, result);
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (req: AuthRequest, res: Response) => {
  const result = await authService.login(req.body, req.ip);
  sendSuccess(res, result);
});

authRouter.post('/refresh', validate(refreshTokenSchema), async (req: AuthRequest, res: Response) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, { tokens });
});

authRouter.post('/logout', async (req: AuthRequest, res: Response) => {
  await authService.logout(req.body.refreshToken, req.user?.sub);
  sendSuccess(res, { message: 'Logged out successfully' });
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  sendSuccess(res, { user });
});
