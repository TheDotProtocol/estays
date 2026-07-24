import fs from 'fs';
import path from 'path';

/** Known env var names uploaded as Render secret files for estays-api. */
const RENDER_SECRET_KEYS = [
  'API_PUBLIC_URL',
  'BOOKINGS_BCC',
  'BOOKINGS_EMAIL_FROM',
  'EMAIL_FROM',
  'SMTP_FROM',
  'SMTP_HOST',
  'SMTP_PASS',
  'SMTP_PORT',
  'SMTP_USER',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'WEB_URL',
  'WELCOME_EMAIL_FROM',
];

function readSecretFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const value = fs.readFileSync(filePath, 'utf8').trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * Render "Secret Files" are mounted as files, not process.env.
 * Load them so existing SMTP/Stripe config works without duplicating into env vars.
 */
export function loadRenderSecretFiles(): void {
  const dirs = ['/etc/secrets', process.cwd()];

  for (const key of RENDER_SECRET_KEYS) {
    if (process.env[key]) continue;

    for (const dir of dirs) {
      const value = readSecretFile(path.join(dir, key));
      if (value) {
        process.env[key] = value;
        break;
      }
    }
  }
}
