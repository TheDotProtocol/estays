import { Router } from 'express';
import { authRouter } from './auth.routes';
import { healthRouter } from './health.routes';
import { hotelRouter } from './hotel.routes';
import { adminRouter } from './admin.routes';
import { bookingRouter } from './booking.routes';
import { paymentRouter } from './payment.routes';
import { uploadRouter } from './upload.routes';
import { notificationRouter } from './notification.routes';
import { loyaltyRouter } from './loyalty.routes';
import { partnerRouter } from './partner.routes';
import { financeRouter } from './finance.routes';

export const routes = Router();

routes.use(healthRouter);
routes.use('/auth', authRouter);
routes.use('/hotels', hotelRouter);
routes.use('/admin', adminRouter);
routes.use('/bookings', bookingRouter);
routes.use('/payments', paymentRouter);
routes.use('/uploads', uploadRouter);
routes.use('/notifications', notificationRouter);
routes.use('/loyalty', loyaltyRouter);
routes.use('/partner', partnerRouter);
routes.use('/finance', financeRouter);

routes.use('/pms', (_req, res) => res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'PMS API - Milestone 4' } }));
routes.use('/analytics', (_req, res) => res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Analytics API - Milestone 6' } }));
