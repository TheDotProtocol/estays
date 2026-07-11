import { settlementService } from '../services/settlement.service';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('settlement-scheduler');

/** Weekly settlement generation — runs every Monday 00:00 UTC for the prior week. */
export function startSettlementScheduler() {
  if (process.env.DISABLE_SETTLEMENT_SCHEDULER === 'true') return;

  const runWeekly = async () => {
    try {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - 1);
      const results = await settlementService.generateAllWeeklySettlements(weekEnd);
      log.info({ count: results.length }, 'Weekly settlements generated');
    } catch (err) {
      log.error({ err }, 'Weekly settlement generation failed');
    }
  };

  const msUntilNextMonday = () => {
    const now = new Date();
    const next = new Date(now);
    const day = now.getUTCDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    next.setUTCDate(now.getUTCDate() + daysUntilMonday);
    next.setUTCHours(0, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  setTimeout(() => {
    runWeekly();
    setInterval(runWeekly, 7 * 24 * 60 * 60 * 1000);
  }, msUntilNextMonday());

  log.info('Settlement scheduler started (weekly on Monday 00:00 UTC)');
}
