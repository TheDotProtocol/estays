import { Response, Router } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { createPaymentSchema, PERMISSIONS, CURRENCIES, PAYMENT_REGIONS, createRazorpayOrderSchema, verifyRazorpayPaymentSchema, createStripeIntentSchema, confirmStripePaymentSchema } from '@estays/shared';
import { isRazorpayConfigured } from '../services/razorpay.service';
import { getStripePublishableKey, isStripeConfigured } from '../services/stripe.service';

export const paymentRouter = Router();

paymentRouter.get('/currencies', (_req, res: Response) => {
  sendSuccess(res, { currencies: Object.values(CURRENCIES), base: 'USD' });
});

paymentRouter.get('/methods', (_req, res: Response) => {
  sendSuccess(res, {
    methods: [
      { id: 'PAY_AT_HOTEL', label: 'Pay at Hotel', description: 'Pay when you check in — no online payment needed', icon: '🏨' },
      { id: 'UPI', label: 'UPI (India)', description: 'Pay via UPI, cards & wallets through Razorpay', icon: '🇮🇳', region: 'INDIA' },
      { id: 'STRIPE', label: 'Credit / Debit Card', description: 'Visa, Mastercard, Amex via Stripe', icon: '💳', region: 'GLOBAL' },
      { id: 'ALIPAY', label: 'Alipay (Thailand)', description: 'Scan with Alipay app', icon: '🇹🇭', region: 'THAILAND' },
      { id: 'THAI_QR', label: 'Thai QR / PromptPay', description: 'Scan with any Thai banking app', icon: '🇹🇭', region: 'THAILAND' },
    ],
    regions: PAYMENT_REGIONS,
  });
});

paymentRouter.get('/razorpay/config', (_req, res: Response) => {
  sendSuccess(res, {
    enabled: isRazorpayConfigured(),
    keyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : null,
  });
});

paymentRouter.get('/stripe/config', (_req, res: Response) => {
  sendSuccess(res, {
    enabled: isStripeConfigured(),
    publishableKey: isStripeConfigured() ? getStripePublishableKey() : null,
  });
});

paymentRouter.use(authenticate);

paymentRouter.post(
  '/razorpay/create-order',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validate(createRazorpayOrderSchema),
  async (req: AuthRequest, res: Response) => {
    const currency = (req.body.currency as string) || 'USD';
    const result = await paymentService.createRazorpayCheckoutOrder(
      req.body.bookingId,
      req.user!.sub,
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
  '/razorpay/verify',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validate(verifyRazorpayPaymentSchema),
  async (req: AuthRequest, res: Response) => {
    const result = await paymentService.verifyRazorpayPayment(
      req.body.paymentId,
      req.user!.sub,
      {
        razorpay_order_id: req.body.razorpay_order_id,
        razorpay_payment_id: req.body.razorpay_payment_id,
        razorpay_signature: req.body.razorpay_signature,
      }
    );
    sendSuccess(res, result);
  }
);

paymentRouter.post(
  '/stripe/create-intent',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validate(createStripeIntentSchema),
  async (req: AuthRequest, res: Response) => {
    const currency = (req.body.currency as string) || 'INR';
    const result = await paymentService.createStripeCheckoutIntent(
      req.body.bookingId,
      req.user!.sub,
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
  '/stripe/confirm',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  validate(confirmStripePaymentSchema),
  async (req: AuthRequest, res: Response) => {
    const result = await paymentService.confirmStripePayment(
      req.body.paymentId,
      req.user!.sub,
      req.body.paymentIntentId
    );
    sendSuccess(res, result);
  }
);

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
