import { Response, Router } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { createPaymentSchema, PERMISSIONS, CURRENCIES, PAYMENT_REGIONS } from '@estays/shared';

export const paymentRouter = Router();

paymentRouter.get('/currencies', (_req, res: Response) => {
  sendSuccess(res, { currencies: Object.values(CURRENCIES), base: 'USD' });
});

paymentRouter.get('/methods', (_req, res: Response) => {
  sendSuccess(res, {
    methods: [
      { id: 'PAY_AT_HOTEL', label: 'Pay at Hotel', description: 'Pay when you check in — no online payment needed', icon: '🏨' },
      { id: 'UPI', label: 'UPI (India)', description: 'Scan QR with GPay, PhonePe, Paytm, or any UPI app', icon: '🇮🇳', region: 'INDIA' },
      { id: 'ALIPAY', label: 'Alipay (Thailand)', description: 'Scan with Alipay app', icon: '🇹🇭', region: 'THAILAND' },
      { id: 'THAI_QR', label: 'Thai QR / PromptPay', description: 'Scan with any Thai banking app', icon: '🇹🇭', region: 'THAILAND' },
    ],
    regions: PAYMENT_REGIONS,
  });
});

paymentRouter.use(authenticate);

paymentRouter.post(
  '/initiate',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validate(createPaymentSchema),
  async (req: AuthRequest, res: Response) => {
    const currency = (req.body.currency as string) || 'USD';
    const result = await paymentService.initiatePayment(
      req.body.bookingId,
      req.user!.sub,
      req.body.method,
      currency,
      {
        payerName: req.body.payerName,
        payerEmail: req.body.payerEmail,
        payerPhone: req.body.payerPhone,
      }
    );
    sendCreated(res, result);
  }
);

paymentRouter.post(
  '/:paymentId/confirm',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  async (req: AuthRequest, res: Response) => {
    const result = await paymentService.confirmQrPayment(param(req.params.paymentId), req.user!.sub);
    sendSuccess(res, result);
  }
);

paymentRouter.get(
  '/booking/:bookingId',
  requirePermission(PERMISSIONS.PAYMENT_READ),
  async (req: AuthRequest, res: Response) => {
    const payments = await paymentService.getPaymentHistory(
      param(req.params.bookingId),
      req.user!.sub
    );
    sendSuccess(res, payments);
  }
);
