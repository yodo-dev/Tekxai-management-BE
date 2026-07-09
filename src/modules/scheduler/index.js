import cron from 'node-cron';
import { run_probation_reminders } from './jobs/probation-reminders.job.js';

// First scheduled job in this codebase (Sprint 1 Phase 4 Milestone 3). There
// was previously zero cron/scheduled-job infrastructure anywhere in be-work
// (no node-cron/agenda/bull). Future time-based automations (the remaining
// rules in the Automation Rulebook that are date/time-driven rather than
// event-driven) should register themselves here the same way: a small job
// function in jobs/, scheduled below with a comment explaining what it does
// and how often it runs.
export function start_scheduler() {
  // Runs once daily at 9:00 AM server time.
  cron.schedule('0 9 * * *', () => {
    run_probation_reminders().catch((err) => {
      console.error('[scheduler] run_probation_reminders failed:', err.message);
    });
  });

  console.log('[scheduler] started — probation reminders scheduled daily at 09:00');
}
