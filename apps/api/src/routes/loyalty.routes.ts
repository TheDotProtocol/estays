import { Response, Router } from 'express';
import { loyaltyService } from '../services/loyalty.service';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { AppError } from '../utils/app-error';

export const loyaltyRouter = Router();

loyaltyRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await userRepository.findById(req.user!.sub);
  if (!user) throw AppError.notFound('User');
  sendSuccess(res, loyaltyService.getProfile(user));
});
