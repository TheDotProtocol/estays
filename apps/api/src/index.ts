import path from 'path';
import dotenv from 'dotenv';
import { loadRenderSecretFiles } from './load-render-secrets';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
loadRenderSecretFiles();

import { createApp } from './app';
import { logger } from '@estays/logger';
import { startSettlementScheduler } from './lib/settlement.scheduler';

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);

async function main() {
  const app = createApp();
  startSettlementScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `E Stays API running on port ${PORT}`);
    logger.info(`Health check: /api/v1/health`);
  });
}

main().catch((err) => {
  logger.fatal(err, 'Failed to start API server');
  process.exit(1);
});
