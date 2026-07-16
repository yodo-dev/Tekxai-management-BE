import { run_compliance_escalation } from '../../compliance-escalation/services/compliance-escalation.service.js';

// Thin wrapper so the scheduler and the manual "run now" API endpoint share
// the exact same engine entry point (compliance-escalation.service.js).
export async function run_compliance_escalation_job() {
  return run_compliance_escalation();
}
