import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { API_PREFIX } from '@estays/shared';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { routes } from './routes';
import { paymentService } from './services/payment.service';
import { constructStripeWebhookEvent, isStripeConfigured } from './services/stripe.service';

export function createApp() {
  const app = express();

  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    })
  );

  app.post(
    `${API_PREFIX}/payments/stripe/webhook`,
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      if (!isStripeConfigured()) {
        res.status(503).send('Stripe not configured');
        return;
      }
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        res.status(400).send('Missing stripe-signature');
        return;
      }
      try {
        const event = constructStripeWebhookEvent(req.body as Buffer, signature);
        if (event.type === 'payment_intent.succeeded') {
          const intent = event.data.object;
          await paymentService.handleStripeWebhookEvent({
            type: event.type,
            data: {
              object: {
                id: intent.id,
                status: intent.status,
                latest_charge: typeof intent.latest_charge === 'string' ? intent.latest_charge : null,
              },
            },
          });
        }
        res.json({ received: true });
      } catch (err) {
        res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }
    }
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  app.use(API_PREFIX, routes);

  app.use(errorHandler);

  return app;
}
